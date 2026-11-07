import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { In, IsNull, Repository } from 'typeorm';
import { UploadService } from '../upload/upload.service';
import { LiveCapture, LiveCaptureStatus } from './entities/live-capture.entity';

// How long the QR code / link stays usable for taking the photo.
const SESSION_MINUTES = 15;
// A finished photo can still be attached to a listing for this long, so a
// seller has time to finish filling in the rest of the form.
const CLAIM_WINDOW_MINUTES = 120;

export interface LiveCaptureStatusView {
  status: LiveCaptureStatus;
  imageUrl: string | null;
  expiresAt: Date;
}

@Injectable()
export class LiveCapturesService {
  constructor(
    @InjectRepository(LiveCapture)
    private readonly capturesRepository: Repository<LiveCapture>,
    private readonly uploadService: UploadService,
  ) {}

  async create(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const capture = this.capturesRepository.create({
      userId,
      token: randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + SESSION_MINUTES * 60_000),
    });
    const saved = await this.capturesRepository.save(capture);
    return { token: saved.token, expiresAt: saved.expiresAt };
  }

  private async findByToken(token: string): Promise<LiveCapture> {
    const capture = await this.capturesRepository.findOne({ where: { token } });
    if (!capture) throw new NotFoundException('This capture link is not valid');
    return capture;
  }

  async getStatus(token: string): Promise<LiveCaptureStatusView> {
    const capture = await this.findByToken(token);
    return { status: capture.status, imageUrl: capture.imageUrl, expiresAt: capture.expiresAt };
  }

  // Called from the phone. The token is the only credential, so this is
  // strictly one photo per session and only while the session is open.
  async submitPhoto(token: string, file: Express.Multer.File | undefined): Promise<LiveCaptureStatusView> {
    if (!file) throw new BadRequestException('No photo received');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('That file is not an image');

    const capture = await this.findByToken(token);
    if (capture.status === LiveCaptureStatus.COMPLETED) {
      throw new BadRequestException('A photo was already taken for this link');
    }
    if (capture.expiresAt.getTime() < Date.now()) {
      throw new GoneException('This capture link has expired — start a new one from your computer');
    }

    const imageUrl = await this.uploadService.uploadLiveImage(file);

    // Conditional update so two simultaneous uploads can't both win.
    const result = await this.capturesRepository.update(
      { id: capture.id, status: LiveCaptureStatus.PENDING },
      { status: LiveCaptureStatus.COMPLETED, imageUrl, completedAt: new Date() },
    );
    if (result.affected === 0) {
      throw new BadRequestException('A photo was already taken for this link');
    }

    return { status: LiveCaptureStatus.COMPLETED, imageUrl, expiresAt: capture.expiresAt };
  }

  // Turns capture tokens into image URLs and marks them used. Verifies the
  // tokens belong to this seller and are finished + unclaimed, so a client
  // can't attach an arbitrary URL (or someone else's photo) as a live photo.
  async claim(userId: string, tokens: string[]): Promise<string[]> {
    const unique = [...new Set(tokens)];
    if (unique.length === 0) return [];

    const captures = await this.capturesRepository.find({ where: { token: In(unique) } });
    if (captures.length !== unique.length) {
      throw new BadRequestException('One of the live photos could not be found — please retake it');
    }

    const cutoff = Date.now() - CLAIM_WINDOW_MINUTES * 60_000;
    for (const c of captures) {
      if (c.userId !== userId) throw new ForbiddenException('That live photo belongs to another account');
      if (c.status !== LiveCaptureStatus.COMPLETED || !c.imageUrl || !c.completedAt) {
        throw new BadRequestException('A live photo has not been taken yet');
      }
      if (c.consumedAt) throw new BadRequestException('A live photo was already used on another listing');
      if (c.completedAt.getTime() < cutoff) {
        throw new BadRequestException('A live photo is too old — please retake it');
      }
    }

    const result = await this.capturesRepository.update(
      { id: In(captures.map((c) => c.id)), consumedAt: IsNull() },
      { consumedAt: new Date() },
    );
    if (result.affected !== captures.length) {
      throw new BadRequestException('A live photo was already used on another listing');
    }

    // Preserve the order the seller took them in.
    const byToken = new Map(captures.map((c) => [c.token, c.imageUrl as string]));
    return unique.map((t) => byToken.get(t) as string);
  }
}
