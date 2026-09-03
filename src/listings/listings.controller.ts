import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Public } from '../auth/decorators/public.decorator';
import { BrowseListingsDto } from './dto/browse-listings.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { BrowseResult, ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // ── Public browse ────────────────────────────────────────────────────────
  // Must be declared before @Get(':id') so 'browse' is not captured as a param
  @Get('browse')
  @Public()
  browse(@Query() dto: BrowseListingsDto): Promise<BrowseResult> {
    return this.listingsService.browse(dto);
  }

  // ── Seller (auth required) ───────────────────────────────────────────────
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, { storage: memoryStorage() }),
  )
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateListingDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.listingsService.create(req.user.id, dto, files ?? []);
  }

  @Get()
  findAll(@Request() req: { user: { id: string } }) {
    return this.listingsService.findAllByUser(req.user.id);
  }

  @Get('user/:userId')
  @Public()
  findByUser(@Param('userId') userId: string) {
    return this.listingsService.findPublishedByUser(userId);
  }

  @Get(':id/more-from-seller')
  @Public()
  moreFromSeller(@Param('id') id: string) {
    return this.listingsService.findMoreFromSeller(id);
  }

  @Get(':id/similar')
  @Public()
  similar(@Param('id') id: string) {
    return this.listingsService.findSimilar(id);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.listingsService.findOneDetail(id);
  }

  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('images', 10, { storage: memoryStorage() }),
  )
  update(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateListingDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.listingsService.update(id, req.user.id, dto, files ?? []);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.listingsService.remove(id, req.user.id);
  }
}
