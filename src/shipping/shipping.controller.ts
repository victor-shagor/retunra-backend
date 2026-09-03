import { Body, Controller, Post } from '@nestjs/common';
import { FetchRatesDto } from './dto/fetch-rates.dto';
import { ShippingService } from './shipping.service';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('rates')
  fetchRates(@Body() dto: FetchRatesDto) {
    return this.shippingService.fetchRates(dto);
  }
}
