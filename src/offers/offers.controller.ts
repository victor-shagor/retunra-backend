import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Request } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OffersService } from './offers.service';

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  create(@Request() req: { user: User }, @Body() dto: CreateOfferDto) {
    return this.offersService.create(req.user.id, dto);
  }

  @Get('mine')
  findMine(@Request() req: { user: User }) {
    return this.offersService.findMineAsBuyer(req.user.id);
  }

  @Get('seller')
  findForSeller(@Request() req: { user: User }) {
    return this.offersService.findForSeller(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req: { user: User }, @Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.findOneForBuyer(id, req.user.id);
  }

  @Patch(':id/accept')
  accept(@Request() req: { user: User }, @Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.accept(id, req.user.id);
  }

  @Patch(':id/decline')
  decline(@Request() req: { user: User }, @Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.decline(id, req.user.id);
  }
}
