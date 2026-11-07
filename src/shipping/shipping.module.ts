import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, User])],
  controllers: [ShippingController],
  providers: [ShippingService],
})
export class ShippingModule {}
