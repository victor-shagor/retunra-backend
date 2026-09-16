import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

const PAYSTACK_BASE = 'https://api.paystack.co';

export interface PaystackVerifyData {
  status: 'success' | 'failed' | 'abandoned' | string;
  reference: string;
  amount: number; // kobo
  currency: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly configService: ConfigService) {}

  private getSecretKey(): string {
    return (this.configService.get<string>('paystack.secretKey') ?? '').trim();
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyData> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      throw new InternalServerErrorException('Payment provider is not configured');
    }

    let res: Response;
    try {
      res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
    } catch (err) {
      this.logger.error('Network error reaching Paystack', err);
      throw new InternalServerErrorException('Failed to reach payment provider');
    }

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      this.logger.warn(`Paystack verify failed: status=${res.status}, body=${JSON.stringify(body)}`);
      throw new InternalServerErrorException((body as any)?.message ?? 'Payment verification failed');
    }

    return (body as any).data;
  }

  // Paystack signs the raw webhook body with the secret key (HMAC SHA512);
  // the signature must be checked against the raw bytes, before any JSON
  // parsing, or a forged webhook could mark arbitrary orders as paid.
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    const secretKey = this.getSecretKey();
    if (!secretKey || !signatureHeader) return false;

    const expected = createHmac('sha512', secretKey).update(rawBody).digest('hex');

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signatureHeader, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
