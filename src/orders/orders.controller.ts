import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Request } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Request() req: { user: User }, @Body() dto: CreateOrderDto) {
    return this.ordersService.createPending(req.user.id, dto);
  }

  @Get()
  findMine(@Request() req: { user: User }) {
    return this.ordersService.findMineAsBuyer(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req: { user: User }, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOneForBuyer(id, req.user.id);
  }

  @Patch(':id/confirm-delivery')
  confirmDelivery(@Request() req: { user: User }, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.confirmDelivery(id, req.user.id);
  }
}
