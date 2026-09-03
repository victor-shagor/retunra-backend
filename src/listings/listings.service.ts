import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { UploadService } from '../upload/upload.service';
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

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    userId: string,
    dto: CreateListingDto,
    files: Express.Multer.File[],
  ): Promise<Listing> {
    const imageUrls = files.length
      ? await this.uploadService.uploadImages(files)
      : [];

    const listing = this.listingsRepository.create({
      ...dto,
      status: dto.status ?? ListingStatus.DRAFT,
      images: imageUrls,
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

  async update(
    id: string,
    userId: string,
    dto: UpdateListingDto,
    files: Express.Multer.File[],
  ): Promise<Listing> {
    const listing = await this.findOneOwned(id, userId);

    const newImageUrls = files.length
      ? await this.uploadService.uploadImages(files)
      : [];

    Object.assign(listing, dto);
    if (newImageUrls.length) {
      listing.images = [...listing.images, ...newImageUrls];
    }

    return this.listingsRepository.save(listing);
  }

  async remove(id: string, userId: string): Promise<void> {
    const listing = await this.findOneOwned(id, userId);
    await this.listingsRepository.remove(listing);
  }
}
