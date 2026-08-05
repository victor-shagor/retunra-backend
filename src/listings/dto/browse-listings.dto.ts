import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ListingCategory, ListingCondition } from '../entities/listing.entity';

export enum BrowseSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
}

export class BrowseListingsDto {
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1))
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 20))
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  q?: string;

  @IsEnum(ListingCategory)
  @IsOptional()
  category?: ListingCategory;

  @IsString()
  @IsOptional()
  subcategory?: string;

  @IsEnum(ListingCondition)
  @IsOptional()
  condition?: ListingCondition;

  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return value === 'true' || value === true;
  })
  @IsBoolean()
  @IsOptional()
  negotiable?: boolean;

  @Transform(({ value }) => (value !== undefined ? parseFloat(value) : undefined))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @Transform(({ value }) => (value !== undefined ? parseFloat(value) : undefined))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @IsEnum(BrowseSort)
  @IsOptional()
  sort?: BrowseSort = BrowseSort.NEWEST;
}
