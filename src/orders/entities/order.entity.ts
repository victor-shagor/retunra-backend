import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Listing } from '../../listings/entities/listing.entity';
import { User } from '../../users/entities/user.entity';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => Listing, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing | null;

  @Column({ name: 'listing_id', nullable: true })
  listingId: string | null;

  @Column({ name: 'item_name' })
  itemName: string;

  @Column({ name: 'item_price', type: 'numeric', precision: 10, scale: 2 })
  itemPrice: string;

  @Column({ name: 'delivery_fee', type: 'numeric', precision: 10, scale: 2 })
  deliveryFee: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total: string;

  @Column({ type: 'varchar', default: 'NGN' })
  currency: string;

  @Column({ name: 'delivery_name' })
  deliveryName: string;

  @Column({ name: 'delivery_phone' })
  deliveryPhone: string;

  @Column({ name: 'delivery_address' })
  deliveryAddress: string;

  @Column({ name: 'delivery_city' })
  deliveryCity: string;

  @Column({ name: 'delivery_state' })
  deliveryState: string;

  @Column({ name: 'delivery_note', type: 'text', nullable: true })
  deliveryNote: string | null;

  @Column({ name: 'courier_name', type: 'varchar', nullable: true })
  courierName: string | null;

  @Column({ name: 'courier_service_code', type: 'varchar', nullable: true })
  courierServiceCode: string | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  @Column({
    name: 'payment_reference',
    type: 'varchar',
    unique: true,
  })
  paymentReference: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
