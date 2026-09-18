import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateOfferDto {
  @IsUUID()
  listingId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;
}
