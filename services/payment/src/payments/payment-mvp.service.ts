import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from '../dto/payment.dto';
import { MockPaymentProvider, PaymentProvider } from './providers.payment';

@Injectable()
export class PaymentMvpService {
  private readonly logger = new Logger(PaymentMvpService.name);
  private readonly provider: PaymentProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.provider = new MockPaymentProvider();
  }

  private async emitEvent(paymentId: string, eventType: string, payload?: Record<string, unknown>) {
    await this.prisma.paymentMvpEvent.create({
      data: {
        payment_id: paymentId,
        event_type: eventType,
        payload: (payload ?? null) as any,
      },
    });
  }

  private async notifyRidePaid(rideId: string, paymentId: string) {
    const rideBase = this.configService.get<string>('RIDE_SERVICE_URL');
    if (!rideBase) return;

    const url = `${rideBase.replace(/\/$/, '')}/internal/payments/paid`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ride_id: rideId, payment_id: paymentId }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Failed to notify ride service: ${res.status} ${body}`);
      throw new InternalServerErrorException('payment_succeeded_but_ride_update_failed');
    }
  }

  async createPayment(dto: CreatePaymentDto) {
    const payment = await this.prisma.paymentMvp.create({
      data: {
        ride_id: dto.ride_id,
        amount: dto.amount,
        status: 'pending',
      },
    });

    const intent = await this.provider.createIntent({
      payment_id: payment.id,
      ride_id: payment.ride_id,
      amount: payment.amount,
      currency: payment.currency,
    });

    let current = await this.prisma.paymentMvp.update({
      where: { id: payment.id },
      data: {
        provider: 'mock',
        provider_payment_id: intent.provider_payment_id,
        status: intent.status,
        failed_at: intent.status === 'failed' ? new Date() : null,
      },
    });

    if (current.status === 'pending') {
      const confirmed = await this.provider.confirmPayment({
        provider_payment_id: intent.provider_payment_id,
      });

      current = await this.prisma.paymentMvp.update({
        where: { id: payment.id },
        data: {
          status: confirmed.status,
          paid_at: confirmed.status === 'paid' ? new Date() : null,
          failed_at: confirmed.status === 'failed' ? new Date() : null,
        },
      });
    }

    if (current.status === 'paid') {
      await this.emitEvent(current.id, 'payment.succeeded', {
        ride_id: current.ride_id,
        amount: current.amount,
      });
      await this.notifyRidePaid(current.ride_id, current.id);
    }

    return current;
  }

  async refundPayment(paymentId: string) {
    const payment = await this.prisma.paymentMvp.findUnique({ where: { id: paymentId } });
    if (!payment) throw new InternalServerErrorException('payment_not_found');
    if (!payment.provider_payment_id) throw new InternalServerErrorException('provider_payment_id_missing');

    const result = await this.provider.refund({ provider_payment_id: payment.provider_payment_id });
    const refunded = await this.prisma.paymentMvp.update({
      where: { id: payment.id },
      data: {
        status: result.status,
        refunded_at: result.status === 'refunded' ? new Date() : null,
      },
    });

    await this.emitEvent(refunded.id, 'payment.refunded', { ride_id: refunded.ride_id });
    return refunded;
  }
}
