import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { LiveCapturesService } from '../live-captures/live-captures.service';
import { UploadService } from '../upload/upload.service';
import { UsersService } from '../users/users.service';
import { BrowseListingsDto, BrowseSort } from './dto/browse-listings.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { Listing, ListingStatus } from './entities/listing.entity';

export interface BrowseResult {
  data: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// How long a checkout hold lasts before another buyer can claim it.
export const RESERVATION_MINUTES = 10;

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly uploadService: UploadService,
    private readonly liveCapturesService: LiveCapturesService,
    private readonly usersService: UsersService,
  ) {}

  // Drafts can be saved half-finished; going live needs a live photo (so
  // buyers can trust the item is real) and a pickup address (so a courier
  // knows where to collect it). Checked before any tokens are consumed or
  // images uploaded, so a rejected publish doesn't burn anything.
  private async assertCanPublish(userId: string, liveImageCount: number): Promise<void> {
    if (liveImageCount < 1) {
      throw new BadRequestException('Add at least one live photo taken with your camera before publishing.');
    }
    if (!(await this.usersService.getPickupAddress(userId))) {
      throw new BadRequestException('Add your pickup address before publishing so couriers know where to collect the item.');
    }
  }

  async create(
    userId: string,
    dto: CreateListingDto,
    files: Express.Multer.File[],
  ): Promise<Listing> {
    const { liveCaptureTokens, ...fields } = dto;
    const status = dto.status ?? ListingStatus.DRAFT;
    const tokens = liveCaptureTokens ?? [];

    if (status === ListingStatus.PUBLISHED) {
      await this.assertCanPublish(userId, tokens.length);
    }

    const liveImages = await this.liveCapturesService.claim(userId, tokens);
    const imageUrls = files.length
      ? await this.uploadService.uploadImages(files)
      : [];

    const listing = this.listingsRepository.create({
      ...fields,
      status,
      images: imageUrls,
      liveImages,
      userId,
    });

    return this.listingsRepository.save(listing);
  }

  async browse(dto: BrowseListingsDto): Promise<BrowseResult> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const qb = this.listingsRepository
      .createQueryBuilder('listing')
      .where('listing.status = :status', { status: ListingStatus.PUBLISHED });

    if (dto.q) {
      qb.andWhere(
        '(listing.title ILIKE :q OR listing.description ILIKE :q)',
        { q: `%${dto.q}%` },
      );
    }
    if (dto.category) {
      qb.andWhere('listing.category = :category', { category: dto.category });
    }
    if (dto.subcategory) {
      qb.andWhere('listing.subcategory ILIKE :subcategory', {
        subcategory: `%${dto.subcategory}%`,
      });
    }
    if (dto.condition) {
      qb.andWhere('listing.condition = :condition', { condition: dto.condition });
    }
    if (dto.negotiable !== undefined) {
      qb.andWhere('listing.negotiable = :negotiable', { negotiable: dto.negotiable });
    }
    if (dto.minPrice !== undefined) {
      qb.andWhere('listing.price >= :minPrice', { minPrice: dto.minPrice });
    }
    if (dto.maxPrice !== undefined) {
      qb.andWhere('listing.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    switch (dto.sort) {
      case BrowseSort.PRICE_ASC:
        qb.orderBy('listing.price', 'ASC');
        break;
      case BrowseSort.PRICE_DESC:
        qb.orderBy('listing.price', 'DESC');
        break;
      case BrowseSort.OLDEST:
        qb.orderBy('listing.createdAt', 'ASC');
        break;
      default:
        qb.orderBy('listing.createdAt', 'DESC');
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  findAllByUser(userId: string): Promise<Listing[]> {
    return this.listingsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  findPublishedByUser(userId: string): Promise<Listing[]> {
    return this.listingsRepository.find({
      where: { userId, status: ListingStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Listing> {
    const listing = await this.listingsRepository.findOne({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async findOneDetail(id: string) {
    const listing = await this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoin('listing.user', 'u')
      .addSelect(['u.storeName', 'u.fullName'])
      .where('listing.id = :id', { id })
      .getOne();

    if (!listing) throw new NotFoundException('Listing not found');

    const { user, ...rest } = listing as any;
    return {
      ...rest,
      storeName: (user?.storeName as string | null) ?? null,
      sellerName: (user?.fullName as string | null) ?? null,
    };
  }

  async findMoreFromSeller(listingId: string, limit = 8): Promise<Listing[]> {
    const listing = await this.listingsRepository.findOne({ where: { id: listingId } });
    if (!listing) return [];
    return this.listingsRepository.find({
      where: { userId: listing.userId, status: ListingStatus.PUBLISHED, id: Not(listingId) },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findSimilar(listingId: string, limit = 8): Promise<Listing[]> {
    const listing = await this.listingsRepository.findOne({ where: { id: listingId } });
    if (!listing || !listing.category) return [];
    return this.listingsRepository.find({
      where: { category: listing.category, status: ListingStatus.PUBLISHED, id: Not(listingId) },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findOneOwned(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOne(id);
    if (listing.userId !== userId) throw new ForbiddenException();
    return listing;
  }

  // Claims (or refreshes) an exclusive checkout hold on a listing. Uses a
  // single atomic UPDATE — rather than read-then-write — so two buyers
  // reserving at nearly the same instant can't both succeed.
  async reserve(id: string, buyerId: string): Promise<{ reservedUntil: Date }> {
    const listing = await this.listingsRepository.findOne({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId === buyerId) {
      throw new ForbiddenException("You can't reserve your own listing");
    }

    const now = new Date();
    const reservedUntil = new Date(now.getTime() + RESERVATION_MINUTES * 60_000);

    const result = await this.listingsRepository
      .createQueryBuilder()
      .update(Listing)
      .set({ reservedByUserId: buyerId, reservedUntil })
      .where('id = :id', { id })
      .andWhere('status = :status', { status: ListingStatus.PUBLISHED })
      .andWhere(
        '(reserved_until IS NULL OR reserved_until < :now OR reserved_by_user_id = :buyerId)',
        { now, buyerId },
      )
      .execute();

    if (result.affected === 0) {
      // Re-check to report the right reason: sold/removed vs. someone
      // else's still-active hold.
      const fresh = await this.listingsRepository.findOne({ where: { id } });
      if (!fresh || fresh.status !== ListingStatus.PUBLISHED) {
        throw new ConflictException('This item is no longer available.');
      }
      throw new ConflictException(
        'This item is currently being purchased by another buyer. Please try again in a few minutes.',
      );
    }

    return { reservedUntil };
  }

  // Best-effort early release (e.g. buyer navigated away from checkout).
  // No-op if this buyer doesn't currently hold the reservation — the hold
  // simply expires on its own otherwise, so there's nothing to error on.
  async release(id: string, buyerId: string): Promise<void> {
    await this.listingsRepository
      .createQueryBuilder()
      .update(Listing)
      .set({ reservedByUserId: null, reservedUntil: null })
      .where('id = :id', { id })
      .andWhere('reserved_by_user_id = :buyerId', { buyerId })
      .execute();
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateListingDto,
    files: Express.Multer.File[],
  ): Promise<Listing> {
    const listing = await this.findOneOwned(id, userId);
    const { liveCaptureTokens, ...fields } = dto;
    const tokens = liveCaptureTokens ?? [];

    const goingLive = fields.status === ListingStatus.PUBLISHED && listing.status !== ListingStatus.PUBLISHED;
    if (goingLive) {
      await this.assertCanPublish(userId, listing.liveImages.length + tokens.length);
    }

    const newLiveImages = await this.liveCapturesService.claim(userId, tokens);
    const newImageUrls = files.length
      ? await this.uploadService.uploadImages(files)
      : [];

    Object.assign(listing, fields);
    if (newImageUrls.length) {
      listing.images = [...listing.images, ...newImageUrls];
    }
    if (newLiveImages.length) {
      listing.liveImages = [...listing.liveImages, ...newLiveImages];
    }

    return this.listingsRepository.save(listing);
  }

  async remove(id: string, userId: string): Promise<void> {
    const listing = await this.findOneOwned(id, userId);
    await this.listingsRepository.remove(listing);
  }
}
