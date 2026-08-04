import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';
import { Listing } from './entities/listing.entity';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Listing]), AuthModule, UploadModule],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
