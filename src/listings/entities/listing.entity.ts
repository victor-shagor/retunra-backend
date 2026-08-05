import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ListingStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export enum ListingGender {
  MALE = 'male',
  FEMALE = 'female',
  KID = 'kid',
}

export enum ListingCondition {
  NEW_TAGS = 'new_tags',
  NEW = 'new',
  LIKE_NEW = 'like_new',
  VERY_GOOD = 'very_good',
  GOOD = 'good',
  SATISFACTORY = 'satisfactory',
}

export enum ListingCategory {
  CLOTHING = 'Clothing',
  SHOES = 'Shoes',
  ACCESSORIES = 'Accessories',
  BAGS = 'Bags',
  HAIR = 'Hair',
}

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ListingCategory, nullable: true })
  category: ListingCategory | null;

  @Column({ type: 'varchar', nullable: true })
  subcategory: string | null;

  @Column({ type: 'enum', enum: ListingGender, nullable: true })
  gender: ListingGender | null;

  @Column({ type: 'enum', enum: ListingCondition, nullable: true })
  condition: ListingCondition | null;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'boolean', default: true })
  negotiable: boolean;

  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.DRAFT,
  })
  status: ListingStatus;

  @Column({ type: 'text', array: true, default: '{}' })
  images: string[];

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
