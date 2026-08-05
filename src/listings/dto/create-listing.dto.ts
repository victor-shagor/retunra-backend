import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  ListingCategory,
  ListingCondition,
  ListingGender,
  ListingStatus,
} from '../entities/listing.entity';

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ListingCategory)
  @IsOptional()
  category?: ListingCategory;

  @IsString()
  @IsOptional()
  subcategory?: string;

  @IsEnum(ListingGender)
  @IsOptional()
  gender?: ListingGender;

  @IsEnum(ListingCondition)
  @IsOptional()
  condition?: ListingCondition;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  negotiable?: boolean;

  @IsEnum(ListingStatus)
  @IsOptional()
  status?: ListingStatus;
}
