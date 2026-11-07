import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadModule } from '../upload/upload.module';
import { LiveCapture } from './entities/live-capture.entity';
import { LiveCapturesController } from './live-captures.controller';
import { LiveCapturesService } from './live-captures.service';

@Module({
  imports: [TypeOrmModule.forFeature([LiveCapture]), UploadModule],
  controllers: [LiveCapturesController],
  providers: [LiveCapturesService],
  exports: [LiveCapturesService],
})
export class LiveCapturesModule {}
