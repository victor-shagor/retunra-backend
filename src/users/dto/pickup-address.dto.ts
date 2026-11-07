import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class PickupAddressDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  state: string;

  // Couriers call this number to arrange the pickup.
  @Transform(trim)
  @Matches(/^\+?[0-9\s-]{7,20}$/, { message: 'Enter a valid phone number for the courier to reach you on' })
  phone: string;
}
