import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class LoginDto {
  @ValidateIf((dto: LoginDto) => !dto.phone)
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ValidateIf((dto: LoginDto) => !dto.email)
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  password: string;
}
