import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>('cloudinary.cloudName'),
      api_key: this.configService.getOrThrow<string>('cloudinary.apiKey'),
      api_secret: this.configService.getOrThrow<string>('cloudinary.apiSecret'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'listings',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload failed: ${JSON.stringify(error ?? 'no result returned')}`);
            reject(new InternalServerErrorException('Image upload failed'));
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }

  // Live photos get a "LIVE" tag rendered into the pixels by Cloudinary, so
  // the marker travels with the image wherever it's displayed. The image is
  // capped first so the tag is a consistent size relative to the photo.
  async uploadLiveImage(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'listings/live',
          resource_type: 'image',
          transformation: [
            { width: 1600, height: 1600, crop: 'limit' },
            {
              overlay: { font_family: 'Arial', font_size: 56, font_weight: 'bold', text: 'LIVE' },
              color: '#FFFFFF',
              background: '#E11D48',
              gravity: 'north_west',
              x: 24,
              y: 24,
            },
          ],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            this.logger.error(`Cloudinary live upload failed: ${JSON.stringify(error ?? 'no result returned')}`);
            reject(new InternalServerErrorException('Image upload failed'));
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }

  async uploadImages(files: Express.Multer.File[], folder = 'listings'): Promise<string[]> {
    return Promise.all(files.map((f) => this.uploadImage(f, folder)));
  }
}
