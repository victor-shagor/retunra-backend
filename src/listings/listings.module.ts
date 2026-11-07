import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LiveCapturesModule } from '../live-captures/live-captures.module';
import { UploadModule } from '../upload/upload.module';
import { UsersModule } from '../users/users.module';
import { Listing } from './entities/listing.entity';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Listing]), AuthModule, UploadModule, LiveCapturesModule, UsersModule],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
