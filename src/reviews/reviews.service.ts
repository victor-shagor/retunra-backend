import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';

export interface ReviewSummary {
  orderId: string;
  rating: number;
  comment: string | null;
}

export interface SellerReviewView {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  buyerName: string;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    private readonly ordersService: OrdersService,
  ) {}

  async create(buyerId: string, dto: CreateReviewDto): Promise<Review> {
    const order = await this.ordersService.findOneRaw(dto.orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException("This isn't your order");
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('You can only rate an order after it has been delivered');
    }

    const review = this.reviewsRepository.create({
      orderId: order.id,
      buyerId,
      sellerId: order.sellerId,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });

    try {
      return await this.reviewsRepository.save(review);
    } catch (err) {
      // Postgres unique_violation on the order_id constraint — this order
      // already has a review.
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictException("You've already rated this order");
      }
      throw err;
    }
  }

  async findMineAsBuyer(buyerId: string): Promise<ReviewSummary[]> {
    const reviews = await this.reviewsRepository.find({ where: { buyerId } });
    return reviews.map((r) => ({ orderId: r.orderId, rating: r.rating, comment: r.comment }));
  }

  async findForSeller(sellerId: string): Promise<SellerReviewView[]> {
    const reviews = await this.reviewsRepository.find({
      where: { sellerId },
      relations: { buyer: true },
      order: { createdAt: 'DESC' },
    });

    return reviews.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      buyerName: r.buyer?.fullName ?? 'A buyer',
    }));
  }
}
