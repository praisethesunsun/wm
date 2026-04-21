import { Controller, Post, Body, Headers, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { OrdersService } from './orders.service';

interface CreateOrderDto {
  items: { itemId: string; qty: number }[];
}

@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: CreateOrderDto,
  ) {
    if (!idempotencyKey) {
      throw new HttpException('Missing Idempotency-Key header', HttpStatus.BAD_REQUEST);
    }
    return this.ordersService.createOrder(idempotencyKey, dto.items);
  }
}
