import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum LiveCaptureStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

// A short-lived session that lets a seller take a camera-only photo on
// their phone while filling in a listing on another device. The random
// token in the QR code is the only credential the phone has.
@Entity('live_captures')
export class LiveCapture {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  token: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: LiveCaptureStatus,
    enumName: 'live_capture_status_enum',
    default: LiveCaptureStatus.PENDING,
  })
  status: LiveCaptureStatus;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
