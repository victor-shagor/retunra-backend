import { Body, Controller, Get, Put, Request } from '@nestjs/common';
import { PickupAddressDto } from './dto/pickup-address.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/pickup')
  getPickup(@Request() req: { user: { id: string } }) {
    return this.usersService.getPickupAddress(req.user.id);
  }

  @Put('me/pickup')
  setPickup(@Request() req: { user: { id: string } }, @Body() dto: PickupAddressDto) {
    return this.usersService.setPickupAddress(req.user.id, dto);
  }
}
