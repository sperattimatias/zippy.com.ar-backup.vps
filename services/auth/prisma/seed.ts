import { PrismaClient, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

type SupportedRole = 'passenger' | 'driver' | 'admin' | 'sos';

const prisma = new PrismaClient();

async function main() {
  const roles: SupportedRole[] = ['passenger', 'driver', 'admin', 'sos'];

  const roleRecords = new Map<SupportedRole, { id: string }>();
  for (const role of roles) {
    const value = await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role },
      select: { id: true },
    });
    roleRecords.set(role, value);
  }

  const email = 'admin@zippy.com.ar';
  const password = process.env.AUTH_ADMIN_PASSWORD ?? 'Admin@Zippy2026!';
  const password_hash = await argon2.hash(password, { type: argon2.argon2id });

  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
      password_hash,
      status: UserStatus.ACTIVE,
      email_verified_at: new Date(),
    },
    create: {
      email,
      password_hash,
      status: UserStatus.ACTIVE,
      email_verified_at: new Date(),
    },
    select: { id: true, email: true },
  });

  for (const role of ['admin', 'sos'] as SupportedRole[]) {
    const roleRef = roleRecords.get(role);
    if (!roleRef) continue;
    await prisma.userRole.upsert({
      where: {
        user_id_role_id: {
          user_id: adminUser.id,
          role_id: roleRef.id,
        },
      },
      update: {},
      create: {
        user_id: adminUser.id,
        role_id: roleRef.id,
      },
    });
  }

  console.info(`Seeded admin user: ${adminUser.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
