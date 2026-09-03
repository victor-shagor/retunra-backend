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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
