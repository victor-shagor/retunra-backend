import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Listing } from '../../listings/entities/listing.entity';
import { User } from '../../users/entities/user.entity';

export enum OfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Listing, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing | null;

  @Column({ name: 'listing_id', nullable: true })
  listingId: string | null;

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

  // Denormalized so the offer's history reads correctly even if the
  // listing is later edited or deleted.
  @Column({ name: 'item_name' })
  itemName: string;

  @Column({ name: 'listed_price', type: 'numeric', precision: 10, scale: 2 })
  listedPrice: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: OfferStatus, default: OfferStatus.PENDING })
  status: OfferStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
