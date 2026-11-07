import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', select: false, nullable: true })
  password: string | null;

  @Column({ type: 'varchar', name: 'google_id', unique: true, nullable: true })
  googleId: string | null;

  @Column({ type: 'varchar', name: 'facebook_id', unique: true, nullable: true })
  facebookId: string | null;

  @Column({ name: 'store_name', type: 'varchar', nullable: true })
  storeName: string | null;

  // Where couriers collect parcels from this seller. Required before a
  // listing can be published.
  @Column({ name: 'pickup_address', type: 'varchar', nullable: true })
  pickupAddress: string | null;

  @Column({ name: 'pickup_city', type: 'varchar', nullable: true })
  pickupCity: string | null;

  @Column({ name: 'pickup_state', type: 'varchar', nullable: true })
  pickupState: string | null;

  @Column({ name: 'pickup_phone', type: 'varchar', nullable: true })
  pickupPhone: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
