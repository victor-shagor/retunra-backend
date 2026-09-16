import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Request() req: { user: User }, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, dto);
  }

  @Get('mine')
  findMine(@Request() req: { user: User }) {
    return this.reviewsService.findMineAsBuyer(req.user.id);
  }
}
