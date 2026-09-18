import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Listing, ListingStatus } from '../listings/entities/listing.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { Offer, OfferStatus } from './entities/offer.entity';

export interface OfferView {
  id: string;
  listingId: string | null;
  itemName: string;
  listingImage: string | null;
  listedPrice: string;
  amount: string;
  status: OfferStatus;
  createdAt: Date;
  buyerName: string;
  // Only set once the buyer has completed checkout for an accepted offer.
  orderId: string | null;
}

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private readonly offersRepository: Repository<Offer>,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async create(buyerId: string, dto: CreateOfferDto): Promise<Offer> {
    const listing = await this.listingsRepository.findOne({ where: { id: dto.listingId } });

    if (!listing || listing.status !== ListingStatus.PUBLISHED) {
      throw new NotFoundException('Listing not found');
    }
    if (!listing.negotiable) {
      throw new BadRequestException('This listing is not open to offers');
    }
    if (listing.userId === buyerId) {
      throw new ForbiddenException("You can't make an offer on your own listing");
    }

    const offer = this.offersRepository.create({
      listingId: listing.id,
      buyerId,
      sellerId: listing.userId,
      itemName: listing.title,
      listedPrice: Number(listing.price).toFixed(2),
      amount: dto.amount.toFixed(2),
      status: OfferStatus.PENDING,
    });

    return this.offersRepository.save(offer);
  }

  private async withOrderIds(offers: Offer[]): Promise<Map<string, string>> {
    const acceptedIds = offers.filter((o) => o.status === OfferStatus.ACCEPTED).map((o) => o.id);
    if (acceptedIds.length === 0) return new Map();

    const orders = await this.ordersRepository.find({ where: { offerId: In(acceptedIds) } });
    return new Map(orders.filter((o) => o.offerId).map((o) => [o.offerId as string, o.id]));
  }

  async findMineAsBuyer(buyerId: string): Promise<OfferView[]> {
    const offers = await this.offersRepository.find({
      where: { buyerId },
      relations: { listing: true },
      order: { createdAt: 'DESC' },
    });
    const orderIdByOffer = await this.withOrderIds(offers);

    return offers.map((o) => ({
      id: o.id,
      listingId: o.listingId,
      itemName: o.itemName,
      listingImage: o.listing?.images?.[0] ?? null,
      listedPrice: o.listedPrice,
      amount: o.amount,
      status: o.status,
      createdAt: o.createdAt,
      buyerName: '',
      orderId: orderIdByOffer.get(o.id) ?? null,
    }));
  }

  async findForSeller(sellerId: string): Promise<OfferView[]> {
    const offers = await this.offersRepository.find({
      where: { sellerId, status: OfferStatus.PENDING },
      relations: { listing: true, buyer: true },
      order: { createdAt: 'DESC' },
    });

    return offers.map((o) => ({
      id: o.id,
      listingId: o.listingId,
      itemName: o.itemName,
      listingImage: o.listing?.images?.[0] ?? null,
      listedPrice: o.listedPrice,
      amount: o.amount,
      status: o.status,
      createdAt: o.createdAt,
      buyerName: o.buyer?.fullName ?? 'A buyer',
      orderId: null,
    }));
  }

  async findOneForBuyer(id: string, buyerId: string): Promise<OfferView> {
    const offer = await this.offersRepository.findOne({ where: { id }, relations: { listing: true } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.buyerId !== buyerId) throw new ForbiddenException("This isn't your offer");

    const orderIdByOffer = await this.withOrderIds([offer]);

    return {
      id: offer.id,
      listingId: offer.listingId,
      itemName: offer.itemName,
      listingImage: offer.listing?.images?.[0] ?? null,
      listedPrice: offer.listedPrice,
      amount: offer.amount,
      status: offer.status,
      createdAt: offer.createdAt,
      buyerName: '',
      orderId: orderIdByOffer.get(offer.id) ?? null,
    };
  }

  private async loadOwnedBySeller(id: string, sellerId: string): Promise<Offer> {
    const offer = await this.offersRepository.findOne({ where: { id } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.sellerId !== sellerId) throw new ForbiddenException("This isn't your offer to resolve");
    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('This offer has already been resolved');
    }
    return offer;
  }

  async accept(id: string, sellerId: string): Promise<Offer> {
    const offer = await this.loadOwnedBySeller(id, sellerId);

    const listing = offer.listingId
      ? await this.listingsRepository.findOne({ where: { id: offer.listingId } })
      : null;
    if (!listing || listing.status !== ListingStatus.PUBLISHED) {
      throw new BadRequestException('This listing is no longer available');
    }

    offer.status = OfferStatus.ACCEPTED;
    const saved = await this.offersRepository.save(offer);

    // A listing can only go to one buyer — auto-decline any other pending
    // offers on it so the seller can't accidentally accept two. `listing`
    // is guaranteed non-null above, so offer.listingId is a real id here
    // (not undefined, which TypeORM would otherwise treat as "no filter").
    await this.offersRepository.update(
      { listingId: listing.id, status: OfferStatus.PENDING },
      { status: OfferStatus.DECLINED },
    );

    return saved;
  }

  async decline(id: string, sellerId: string): Promise<Offer> {
    const offer = await this.loadOwnedBySeller(id, sellerId);
    offer.status = OfferStatus.DECLINED;
    return this.offersRepository.save(offer);
  }
}
