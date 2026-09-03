import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FetchRatesDto } from './dto/fetch-rates.dto';

const SHIPBUBBLE_API = 'https://api.shipbubble.com/v1/shipping/fetch_rates';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(private readonly configService: ConfigService) {}

  async fetchRates(dto: FetchRatesDto) {
    const rawKey = this.configService.get<string>('shipbubble.apiKey') || process.env.SHIPBUBBLE_API_KEY || '';
    const apiKey = rawKey.trim();

    this.logger.log(`API key present: ${!!apiKey}, length: ${apiKey.length}, prefix: ${apiKey.slice(0, 12) || 'none'}`);

    if (!apiKey) {
      throw new InternalServerErrorException('Shipping provider is not configured');
    }

    const payload = {
      sender_details: {
        name: this.configService.get<string>('shipbubble.senderName') ?? 'Retunra Seller',
        email: 'seller@retunra.com',
        phone: this.configService.get<string>('shipbubble.senderPhone') ?? '08000000000',
        address: this.configService.get<string>('shipbubble.senderAddress') ?? '1 Broad Street, Marina',
        state: this.configService.get<string>('shipbubble.senderState') ?? 'Lagos',
        city: this.configService.get<string>('shipbubble.senderCity') ?? 'Lagos Island',
        country: 'NG',
      },
      receiver_details: {
        name: dto.receiver.name,
        email: 'buyer@retunra.com',
        phone: dto.receiver.phone,
        address: dto.receiver.address,
        state: dto.receiver.state,
        city: dto.receiver.city,
        country: 'NG',
      },
      parcel_type: 'parcel',
      package_items: [
        {
          name: dto.itemName,
          description: dto.itemName,
          unit_weight: 0.5,
          unit_amount: dto.itemPrice,
          quantity: 1,
        },
      ],
    };

    const authHeader = `Bearer ${apiKey}`;
    this.logger.log(`Calling Shipbubble → receiver: ${dto.receiver.city}, ${dto.receiver.state}, auth header length: ${authHeader.length}`);

    let res: Response;
    try {
      res = await fetch(SHIPBUBBLE_API, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      this.logger.error('Network error reaching Shipbubble', err);
      throw new InternalServerErrorException('Failed to reach shipping provider');
    }

    const body = await res.json().catch(() => ({}));

    this.logger.log(`Shipbubble response: status=${res.status}, body=${JSON.stringify(body)}`);

    if (!res.ok) {
      throw new InternalServerErrorException(
        (body as any)?.message ?? 'Shipbubble request failed',
      );
    }

    return body;
  }
}
