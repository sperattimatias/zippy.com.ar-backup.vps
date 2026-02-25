import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { LogoutDto } from '../dto/logout.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private sha256(input: string) {
    return createHash('sha256').update(input).digest('hex');
  }

  private generateVerificationCode() {
    return `${Math.floor(100000 + Math.random() * 900000)}`;
  }

  private generateRefreshTokenRaw() {
    return randomBytes(64).toString('base64url');
  }

  private async issueTokens(userId: string, email: string, roles: string[], meta?: { userAgent?: string; ip?: string }) {
    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshDays = this.configService.get<number>('REFRESH_TOKEN_EXPIRES_DAYS', 30);

    const access_token = await this.jwtService.signAsync(
      { sub: userId, email, roles },
      { secret: accessSecret, expiresIn: accessExpiresIn, algorithm: 'HS256' },
    );

    const refresh_token = this.generateRefreshTokenRaw();
    const token_hash = this.sha256(refresh_token);
    const expires_at = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    const dbToken = await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash,
        expires_at,
        user_agent: meta?.userAgent,
        ip: meta?.ip,
      },
    });

    return { access_token, refresh_token, refresh_token_id: dbToken.id };
  }

  async register(dto: RegisterDto) {
    const password_hash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password_hash,
        status: UserStatus.ACTIVE,
      },
    }).catch(() => {
      throw new BadRequestException('Email already registered');
    });

    const passengerRole = await this.prisma.role.upsert({
      where: { name: 'passenger' },
      create: { name: 'passenger' },
      update: {},
    });

    await this.prisma.userRole.create({ data: { user_id: user.id, role_id: passengerRole.id } });

    const code = this.generateVerificationCode();
    const code_hash = this.sha256(code);
    const ttlMin = this.configService.get<number>('EMAIL_VERIFICATION_TTL_MIN', 10);

    await this.prisma.emailVerificationCode.create({
      data: {
        user_id: user.id,
        code_hash,
        expires_at: new Date(Date.now() + ttlMin * 60 * 1000),
      },
    });

    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      // Only in dev
      console.info(`[DEV] verification code for ${user.email}: ${code}`);
    }

    return { message: 'registered', email: user.email };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new NotFoundException('User not found');

    const record = await this.prisma.emailVerificationCode.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    if (!record) throw new BadRequestException('Verification code not found');
    if (record.expires_at < new Date()) throw new BadRequestException('Verification code expired');
    if (record.attempts >= 5) throw new ForbiddenException('Too many attempts');

    const matches = this.sha256(dto.code) === record.code_hash;
    if (!matches) {
      await this.prisma.emailVerificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { email_verified_at: new Date() },
    });

    return { message: 'email verified' };
  }

  async login(dto: LoginDto, meta?: { userAgent?: string; ip?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { roles: { include: { role: true } } },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== UserStatus.ACTIVE) throw new ForbiddenException('User suspended');
    if (!user.email_verified_at) throw new ForbiddenException('Email not verified');

    const passOk = await argon2.verify(user.password_hash, dto.password);
    if (!passOk) throw new UnauthorizedException('Invalid credentials');

    const roles = user.roles.map((ur) => ur.role.name);
    const tokens = await this.issueTokens(user.id, user.email, roles, meta);
    return tokens;
  }

  async refresh(dto: RefreshDto, meta?: { userAgent?: string; ip?: string }) {
    const tokenHash = this.sha256(dto.refresh_token);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { token_hash: tokenHash },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    if (!existing) throw new UnauthorizedException('Refresh token invalid');
    if (existing.revoked_at) throw new UnauthorizedException('Refresh token revoked');
    if (existing.expires_at < new Date()) throw new UnauthorizedException('Refresh token expired');

    const roles = existing.user.roles.map((ur) => ur.role.name);
    const next = await this.issueTokens(existing.user.id, existing.user.email, roles, meta);

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revoked_at: new Date(), replaced_by_token_id: next.refresh_token_id },
    });

    return { access_token: next.access_token, refresh_token: next.refresh_token };
  }

  async logout(dto: LogoutDto) {
    if (dto.all) {
      if (!dto.refresh_token) return { message: 'nothing to revoke' };
      const tokenHash = this.sha256(dto.refresh_token);
      const existing = await this.prisma.refreshToken.findFirst({ where: { token_hash: tokenHash } });
      if (!existing) return { message: 'nothing to revoke' };
      await this.prisma.refreshToken.updateMany({
        where: { user_id: existing.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      return { message: 'logged out all sessions' };
    }

    if (dto.refresh_token) {
      const tokenHash = this.sha256(dto.refresh_token);
      await this.prisma.refreshToken.updateMany({
        where: { token_hash: tokenHash, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }

    return { message: 'logged out' };
  }

  
  async grantRole(userId: string, roleName: 'driver') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.prisma.role.upsert({ where: { name: roleName }, create: { name: roleName }, update: {} });
    await this.prisma.userRole.upsert({
      where: { user_id_role_id: { user_id: userId, role_id: role.id } },
      create: { user_id: userId, role_id: role.id },
      update: {},
    });

    return { message: 'role granted', user_id: userId, role: roleName };
  }
async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      email_verified_at: user.email_verified_at,
      roles: user.roles.map((ur) => ur.role.name),
    };
  }
}
