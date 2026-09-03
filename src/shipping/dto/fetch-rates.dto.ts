import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';

export class ReceiverDto {
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

export class FetchRatesDto {
  @ValidateNested()
  @Type(() => ReceiverDto)
  receiver: ReceiverDto;

  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsNumber()
  itemPrice: number;
}
