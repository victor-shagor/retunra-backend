import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Public } from '../auth/decorators/public.decorator';
import { LiveCapturesService } from './live-captures.service';

@Controller('live-captures')
export class LiveCapturesController {
  constructor(private readonly liveCapturesService: LiveCapturesService) {}

  // Seller, on whichever device they're listing from.
  @Post()
  create(@Request() req: { user: { id: string } }) {
    return this.liveCapturesService.create(req.user.id);
  }

  // The two endpoints below are used from the phone that scanned the QR
  // code, which may not be logged in — the random token is the credential.
  @Public()
  @Get(':token')
  status(@Param('token') token: string) {
    return this.liveCapturesService.getStatus(token);
  }

  @Public()
  @Post(':token/photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }),
  )
  submit(@Param('token') token: string, @UploadedFile() file: Express.Multer.File | undefined) {
    return this.liveCapturesService.submitPhoto(token, file);
  }
}
