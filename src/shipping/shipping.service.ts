import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FetchRatesDto } from './dto/fetch-rates.dto';

const SHIPBUBBLE_BASE = 'https://api.shipbubble.com/v1/shipping';
const VALIDATE_ADDRESS_URL = `${SHIPBUBBLE_BASE}/address/validate`;
const FETCH_RATES_URL = `${SHIPBUBBLE_BASE}/fetch_rates`;

// "Fashion wears" — from Shipbubble's documented example response for
// GET /v1/shipping/labels/categories. Retunra doesn't yet map its own
// listing categories (Clothing/Shoes/Accessories/Bags/Hair) to Shipbubble
// category ids, so every request uses this one. Re-verify this id against
// the live /labels/categories response once dashboard API access is enabled
// — documented example ids aren't guaranteed to match this account's data.
const DEFAULT_CATEGORY_ID = 98246239;

// No listing captures package dimensions yet, so every request uses a
// fixed parcel size (cm), same spirit as the existing hardcoded 0.5kg
// unit_weight below.
const DEFAULT_PACKAGE_DIMENSION = { length: 20, width: 20, height: 10 };

interface AddressDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  // Sender address is fixed for the whole app, so its address_code is
  // validated once and cached rather than re-validated on every request.
  private senderAddressCodePromise: Promise<number> | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string {
    const rawKey = this.configService.get<string>('shipbubble.apiKey') || process.env.SHIPBUBBLE_API_KEY || '';
    return rawKey.trim();
  }

  private async validateAddress(apiKey: string, details: AddressDetails): Promise<number> {
    let res: Response;
    try {
      res = await fetch(VALIDATE_ADDRESS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(details),
      });
    } catch (err) {
      this.logger.error('Network error validating address with Shipbubble', err);
      throw new InternalServerErrorException('Failed to reach shipping provider');
    }

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      this.logger.warn(`Shipbubble address validation failed: status=${res.status}, body=${JSON.stringify(body)}`);
      throw new InternalServerErrorException(
        (body as any)?.message ?? 'Shipbubble address validation failed',
      );
    }

    const addressCode = (body as any)?.data?.address_code;
    if (!addressCode) {
      throw new InternalServerErrorException('Shipbubble did not return an address_code');
    }

    return addressCode;
  }

  private getSenderAddressCode(apiKey: string): Promise<number> {
    if (!this.senderAddressCodePromise) {
      const details: AddressDetails = {
        name: this.configService.get<string>('shipbubble.senderName') ?? 'Retunra Seller',
        email: 'seller@retunra.com',
        phone: this.configService.get<string>('shipbubble.senderPhone') ?? '08000000000',
        address: this.configService.get<string>('shipbubble.senderAddress') ?? '1 Broad Street, Marina',
      };

      // Cache the promise (not just the resolved value) so concurrent
      // requests don't each trigger their own validation call; if it
      // fails, clear the cache so the next request retries.
      this.senderAddressCodePromise = this.validateAddress(apiKey, details).catch((err) => {
        this.senderAddressCodePromise = null;
        throw err;
      });
    }

    return this.senderAddressCodePromise;
  }

  private todayAsPickupDate(): string {
    return new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  }

  async fetchRates(dto: FetchRatesDto) {
    const apiKey = this.getApiKey();

    this.logger.log(`API key present: ${!!apiKey}, length: ${apiKey.length}, prefix: ${apiKey.slice(0, 12) || 'none'}`);

    if (!apiKey) {
      throw new InternalServerErrorException('Shipping provider is not configured');
    }

    const [senderAddressCode, receiverAddressCode] = await Promise.all([
      this.getSenderAddressCode(apiKey),
      this.validateAddress(apiKey, {
        name: dto.receiver.name,
        email: 'buyer@retunra.com',
        phone: dto.receiver.phone,
        address: `${dto.receiver.address}, ${dto.receiver.city}, ${dto.receiver.state}`,
      }),
    ]);

    const payload = {
      sender_address_code: senderAddressCode,
      reciever_address_code: receiverAddressCode,
      pickup_date: this.todayAsPickupDate(),
      category_id: DEFAULT_CATEGORY_ID,
      package_dimension: DEFAULT_PACKAGE_DIMENSION,
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

    this.logger.log(`Calling Shipbubble fetch_rates → sender_address_code=${senderAddressCode}, reciever_address_code=${receiverAddressCode}`);

    let res: Response;
    try {
      res = await fetch(FETCH_RATES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
