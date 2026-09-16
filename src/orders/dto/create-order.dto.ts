import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class OrderReceiverDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}

export class CreateOrderDto {
  @IsUUID()
  listingId: string;

  @ValidateNested()
  @Type(() => OrderReceiverDto)
  receiver: OrderReceiverDto;

  @IsOptional()
  @IsString()
  note?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  deliveryFee: number;

  @IsOptional()
  @IsString()
  courierName?: string;

  @IsOptional()
  @IsString()
  courierServiceCode?: string;
}
