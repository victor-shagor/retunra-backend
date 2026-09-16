import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  Req,
  Request,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { OrdersService } from '../orders/orders.service';
import { User } from '../users/entities/user.entity';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post('verify')
  async verify(@Request() req: { user: User }, @Body() dto: VerifyPaymentDto) {
    const order = await this.ordersService.findByReference(dto.reference);
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== req.user.id) {
      throw new ForbiddenException("This isn't your order");
    }

    if (order.paymentStatus === 'paid') return order;

    const data = await this.paymentsService.verifyTransaction(dto.reference);

    const expectedKobo = Math.round(Number(order.total) * 100);
    const amountMatches = data.amount === expectedKobo;
    const currencyMatches = data.currency === order.currency;

    if (data.status !== 'success' || !amountMatches || !currencyMatches) {
      this.logger.warn(
        `Payment verification mismatch for ${dto.reference}: status=${data.status}, amount=${data.amount} (expected ${expectedKobo}), currency=${data.currency}`,
      );
      throw new BadRequestException('Payment could not be verified');
    }

    return this.ordersService.markPaid(order);
  }

  // Paystack calls this directly (not the browser), so it can't carry a
  // user JWT — authenticity instead comes from the HMAC signature below.
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('x-paystack-signature') signature: string | undefined,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || !this.paymentsService.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Rejected webhook with invalid Paystack signature');
      return { received: false };
    }

    const event = req.body as { event?: string; data?: { reference?: string } };

    if (event.event === 'charge.success' && event.data?.reference) {
      const order = await this.ordersService.findByReference(event.data.reference);
      if (order) {
        await this.ordersService.markPaid(order);
      } else {
        this.logger.warn(`Webhook charge.success for unknown reference: ${event.data.reference}`);
      }
    }

    return { received: true };
  }
}
