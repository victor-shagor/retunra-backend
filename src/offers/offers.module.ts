import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { Order } from '../orders/entities/order.entity';
import { Offer } from './entities/offer.entity';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Offer, Listing, Order])],
  controllers: [OffersController],
  providers: [OffersService],
})
export class OffersModule {}
