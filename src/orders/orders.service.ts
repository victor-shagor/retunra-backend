import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Listing, ListingStatus } from '../listings/entities/listing.entity';
import { Offer, OfferStatus } from '../offers/entities/offer.entity';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { EscrowStatus, Order, OrderStatus, PaymentStatus } from './entities/order.entity';

export interface OrderView {
  id: string;
  itemName: string;
  itemPrice: string;
  deliveryFee: string;
  total: string;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  escrowStatus: EscrowStatus;
  disputeReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  listingId: string | null;
  listingImage: string | null;
  sellerId: string;
  sellerName: string;
  courierName: string | null;
  courierServiceCode: string | null;
  deliveryName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryNote: string | null;
}

export interface SellerOrderView {
  id: string;
  itemName: string;
  itemPrice: string;
  deliveryFee: string;
  total: string;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  escrowStatus: EscrowStatus;
  createdAt: Date;
  updatedAt: Date;
  listingId: string | null;
  listingImage: string | null;
  buyerName: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @InjectRepository(Offer)
    private readonly offersRepository: Repository<Offer>,
  ) {}

  async createPending(buyerId: string, dto: CreateOrderDto): Promise<Order> {
    const listing = await this.listingsRepository.findOne({ where: { id: dto.listingId } });

    if (!listing || listing.status !== ListingStatus.PUBLISHED) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId === buyerId) {
      throw new ForbiddenException("You can't buy your own listing");
    }

    let itemPrice = Number(listing.price);
    let offerId: string | null = null;

    if (dto.offerId) {
      const offer = await this.offersRepository.findOne({ where: { id: dto.offerId } });
      if (!offer) throw new NotFoundException('Offer not found');
      if (offer.buyerId !== buyerId) throw new ForbiddenException("This isn't your offer");
      if (offer.listingId !== listing.id) {
        throw new BadRequestException('This offer is for a different listing');
      }
      if (offer.status !== OfferStatus.ACCEPTED) {
        throw new BadRequestException('This offer has not been accepted yet');
      }
      itemPrice = Number(offer.amount);
      offerId = offer.id;
    }

    const deliveryFee = dto.deliveryFee;
    const total = itemPrice + deliveryFee;

    const order = this.ordersRepository.create({
      buyerId,
      sellerId: listing.userId,
      listingId: listing.id,
      offerId,
      itemName: listing.title,
      itemPrice: itemPrice.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      total: total.toFixed(2),
      currency: 'NGN',
      deliveryName: dto.receiver.name,
      deliveryPhone: dto.receiver.phone,
      deliveryAddress: dto.receiver.address,
      deliveryCity: dto.receiver.city,
      deliveryState: dto.receiver.state,
      deliveryNote: dto.note ?? null,
      courierName: dto.courierName ?? null,
      courierServiceCode: dto.courierServiceCode ?? null,
      status: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
      // Prefixed + unique per order — Paystack requires a fresh reference
      // for every transaction attempt.
      paymentReference: `rtr-${randomUUID()}`,
    });

    try {
      return await this.ordersRepository.save(order);
    } catch (err) {
      // Postgres unique_violation on offer_id — this offer already has an
      // order (e.g. the buyer double-submitted checkout).
      if (offerId && (err as { code?: string })?.code === '23505') {
        throw new ConflictException('This offer has already been used for an order');
      }
      throw err;
    }
  }

  async findByReference(reference: string): Promise<Order | null> {
    return this.ordersRepository.findOne({ where: { paymentReference: reference } });
  }

  private toView(order: Order): OrderView {
    return {
      id: order.id,
      itemName: order.itemName,
      itemPrice: order.itemPrice,
      deliveryFee: order.deliveryFee,
      total: order.total,
      currency: order.currency,
      status: order.status,
      paymentStatus: order.paymentStatus,
      escrowStatus: order.escrowStatus,
      disputeReason: order.disputeReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      listingId: order.listingId,
      // The listing may have been deleted since purchase (FK is ON DELETE
      // SET NULL), so fall back to null rather than erroring.
      listingImage: order.listing?.images?.[0] ?? null,
      sellerId: order.sellerId,
      sellerName: order.seller?.storeName ?? order.seller?.fullName ?? 'Retunrà seller',
      courierName: order.courierName,
      courierServiceCode: order.courierServiceCode,
      deliveryName: order.deliveryName,
      deliveryPhone: order.deliveryPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryCity: order.deliveryCity,
      deliveryState: order.deliveryState,
      deliveryNote: order.deliveryNote,
    };
  }

  async findMineAsBuyer(buyerId: string): Promise<OrderView[]> {
    const orders = await this.ordersRepository.find({
      where: { buyerId },
      relations: { listing: true, seller: true },
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => this.toView(order));
  }

  async findMineAsSeller(sellerId: string): Promise<SellerOrderView[]> {
    const orders = await this.ordersRepository.find({
      where: { sellerId },
      relations: { listing: true, buyer: true },
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => ({
      id: order.id,
      itemName: order.itemName,
      itemPrice: order.itemPrice,
      deliveryFee: order.deliveryFee,
      total: order.total,
      currency: order.currency,
      status: order.status,
      paymentStatus: order.paymentStatus,
      escrowStatus: order.escrowStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      listingId: order.listingId,
      listingImage: order.listing?.images?.[0] ?? null,
      buyerName: order.buyer?.fullName ?? 'A buyer',
    }));
  }

  async findOneForBuyer(id: string, buyerId: string): Promise<OrderView> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { listing: true, seller: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException("This isn't your order");

    return this.toView(order);
  }

  async findOneRaw(id: string): Promise<Order | null> {
    return this.ordersRepository.findOne({ where: { id } });
  }

  async markPaid(order: Order): Promise<Order> {
    if (order.paymentStatus === PaymentStatus.PAID) return order;
    order.paymentStatus = PaymentStatus.PAID;
    order.status = OrderStatus.PROCESSING;
    const saved = await this.ordersRepository.save(order);

    // Take the listing off the browse page now that it's actually sold.
    // Scoped to status = PUBLISHED so this is a no-op if it's already
    // been marked sold or was taken down some other way.
    if (order.listingId) {
      await this.listingsRepository.update(
        { id: order.listingId, status: ListingStatus.PUBLISHED },
        { status: ListingStatus.SOLD },
      );
    }

    return saved;
  }

  private async loadOwnedOrder(id: string, buyerId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { listing: true, seller: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException("This isn't your order");
    return order;
  }

  private assertCanResolveDelivery(order: Order): void {
    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('This order has not been paid for yet');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('This order was cancelled');
    }
    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.DISPUTED) {
      throw new BadRequestException('This order has already been resolved');
    }
  }

  // The buyer confirms they're happy with what arrived — this is what
  // actually releases the escrow hold described at checkout. There's no
  // seller/courier-driven status flow yet (nothing marks an order
  // "shipped" on its own), so this is reachable from "processing" too,
  // not just "shipped".
  //
  // Note: escrowStatus is bookkeeping only right now — see the comment on
  // Order.escrowStatus. No real payout to the seller happens here yet.
  async markSatisfied(id: string, buyerId: string): Promise<OrderView> {
    const order = await this.loadOwnedOrder(id, buyerId);
    this.assertCanResolveDelivery(order);

    order.status = OrderStatus.DELIVERED;
    order.escrowStatus = EscrowStatus.RELEASED;
    const saved = await this.ordersRepository.save(order);
    return this.toView(saved);
  }

  // The buyer says the item didn't meet expectations — escrow stays held
  // (nothing is released to the seller) and the order moves to "disputed"
  // for manual follow-up. There's no automated refund or admin resolution
  // flow yet; this just records the dispute and the reason.
  async reportIssue(id: string, buyerId: string, reason: string): Promise<OrderView> {
    const order = await this.loadOwnedOrder(id, buyerId);
    this.assertCanResolveDelivery(order);

    order.status = OrderStatus.DISPUTED;
    order.disputeReason = reason;
    const saved = await this.ordersRepository.save(order);
    return this.toView(saved);
  }
}
