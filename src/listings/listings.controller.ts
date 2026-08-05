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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BrowseListingsDto } from './dto/browse-listings.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { BrowseResult, ListingsService } from './listings.service';

@UseGuards(JwtAuthGuard)
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

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.listingsService.findOne(id, req.user.id);
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
