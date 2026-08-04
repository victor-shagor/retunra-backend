import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadService } from '../upload/upload.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { Listing, ListingStatus } from './entities/listing.entity';

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

  findAllByUser(userId: string): Promise<Listing[]> {
    return this.listingsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Listing> {
    const listing = await this.listingsRepository.findOne({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId !== userId) throw new ForbiddenException();
    return listing;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateListingDto,
    files: Express.Multer.File[],
  ): Promise<Listing> {
    const listing = await this.findOne(id, userId);

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
    const listing = await this.findOne(id, userId);
    await this.listingsRepository.remove(listing);
  }
}
