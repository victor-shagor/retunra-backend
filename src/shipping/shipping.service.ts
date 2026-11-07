import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';
import { FetchRatesDto } from './dto/fetch-rates.dto';

const SHIPBUBBLE_BASE = 'https://api.shipbubble.com/v1/shipping';
const VALIDATE_ADDRESS_URL = `${SHIPBUBBLE_BASE}/address/validate`;
const FETCH_RATES_URL = `${SHIPBUBBLE_BASE}/fetch_rates`;

// "Fashion wears" — id confirmed against this account's live
// GET /v1/shipping/labels/categories response. Retunra doesn't yet map its
// own listing categories (Clothing/Shoes/Accessories/Bags/Hair) to
// Shipbubble category ids, so every request uses this one.
const DEFAULT_CATEGORY_ID = 74794423;

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

  // Shipbubble address codes by address, so a seller's pickup address is only
  // validated once. The promise is cached (not the resolved value) so
  // concurrent quotes share one validation call; failures are evicted.
  private readonly addressCodes = new Map<string, Promise<number>>();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

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

  private getAddressCode(apiKey: string, details: AddressDetails): Promise<number> {
    const key = [details.name, details.phone, details.address].join('|');
    let cached = this.addressCodes.get(key);
    if (!cached) {
      cached = this.validateAddress(apiKey, details).catch((err) => {
        this.addressCodes.delete(key);
        throw err;
      });
      this.addressCodes.set(key, cached);
    }
    return cached;
  }

  // The origin of the parcel is the seller of the listing being bought —
  // not a single app-wide address.
  private async getSenderDetails(listingId: string): Promise<AddressDetails> {
    const listing = await this.listingsRepository.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    const seller = await this.usersRepository.findOne({ where: { id: listing.userId } });
    if (!seller?.pickupAddress || !seller.pickupCity || !seller.pickupState || !seller.pickupPhone) {
      throw new BadRequestException(
        "This seller hasn't added a pickup address yet, so delivery can't be arranged. Please try again later.",
      );
    }

    return {
      name: seller.storeName ?? seller.fullName,
      email: seller.email,
      phone: seller.pickupPhone,
      // Shipbubble's address validator needs the full location — street,
      // city, state and country — in this one string.
      address: `${seller.pickupAddress}, ${seller.pickupCity}, ${seller.pickupState}, Nigeria`,
    };
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

    const sender = await this.getSenderDetails(dto.listingId);

    const [senderAddressCode, receiverAddressCode] = await Promise.all([
      this.getAddressCode(apiKey, sender),
      this.getAddressCode(apiKey, {
        name: dto.receiver.name,
        email: 'buyer@retunra.com',
        phone: dto.receiver.phone,
        address: `${dto.receiver.address}, ${dto.receiver.city}, ${dto.receiver.state}, Nigeria`,
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
