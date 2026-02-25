export type PaymentIntentResult = {
  provider_payment_id: string;
  status: 'pending' | 'paid' | 'failed';
  raw?: unknown;
};

export interface PaymentProvider {
  createIntent(input: {
    payment_id: string;
    ride_id: string;
    amount: number;
    currency: string;
  }): Promise<PaymentIntentResult>;
  confirmPayment(input: { provider_payment_id: string }): Promise<PaymentIntentResult>;
  refund(input: { provider_payment_id: string; amount?: number }): Promise<{ status: 'refunded' | 'failed'; raw?: unknown }>;
}

export class MockPaymentProvider implements PaymentProvider {
  async createIntent(input: {
    payment_id: string;
    ride_id: string;
    amount: number;
    currency: string;
  }): Promise<PaymentIntentResult> {
    const shouldFail = input.amount <= 0;
    return {
      provider_payment_id: `mock_${input.payment_id}`,
      status: shouldFail ? 'failed' : 'pending',
      raw: { provider: 'mock', ride_id: input.ride_id },
    };
  }

  async confirmPayment(input: { provider_payment_id: string }): Promise<PaymentIntentResult> {
    return {
      provider_payment_id: input.provider_payment_id,
      status: 'paid',
      raw: { provider: 'mock', confirmed_at: new Date().toISOString() },
    };
  }

  async refund(_input: { provider_payment_id: string; amount?: number }): Promise<{ status: 'refunded' | 'failed'; raw?: unknown }> {
    return { status: 'refunded', raw: { provider: 'mock', refunded_at: new Date().toISOString() } };
  }
}
