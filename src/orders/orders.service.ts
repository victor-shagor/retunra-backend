import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Listing, ListingStatus } from '../listings/entities/listing.entity';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';

export interface OrderView {
  id: string;
  itemName: string;
  itemPrice: string;
  deliveryFee: string;
  total: string;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
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

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {}

  async createPending(buyerId: string, dto: CreateOrderDto): Promise<Order> {
    const listing = await this.listingsRepository.findOne({ where: { id: dto.listingId } });

    if (!listing || listing.status !== ListingStatus.PUBLISHED) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId === buyerId) {
      throw new ForbiddenException("You can't buy your own listing");
    }

    const itemPrice = Number(listing.price);
    const deliveryFee = dto.deliveryFee;
    const total = itemPrice + deliveryFee;

    const order = this.ordersRepository.create({
      buyerId,
      sellerId: listing.userId,
      listingId: listing.id,
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

    return this.ordersRepository.save(order);
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
    return this.ordersRepository.save(order);
  }

  // The buyer confirms receipt themselves — this is what releases the
  // escrow hold described at checkout. There's no seller/courier-driven
  // status flow yet (nothing marks an order "shipped"), so this is
  // reachable from "processing" too, not just "shipped".
  async confirmDelivery(id: string, buyerId: string): Promise<OrderView> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { listing: true, seller: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException("This isn't your order");

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('This order was cancelled');
    }
    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('This order has not been paid for yet');
    }

    order.status = OrderStatus.DELIVERED;
    const saved = await this.ordersRepository.save(order);
    return this.toView(saved);
  }
}
