import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FetchRatesDto } from './dto/fetch-rates.dto';

const SHIPBUBBLE_API = 'https://api.shipbubble.com/v1/shipping/fetch_rates';

@Injectable()
export class ShippingService {
  constructor(private readonly configService: ConfigService) {}

  async fetchRates(dto: FetchRatesDto) {
    const apiKey = this.configService.get<string>('shipbubble.apiKey');

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

    let res: Response;
    try {
      res = await fetch(SHIPBUBBLE_API, {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new InternalServerErrorException('Failed to reach shipping provider');
    }

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new InternalServerErrorException(
        (body as any)?.message ?? 'Shipbubble request failed',
      );
    }

    return body;
  }
}
