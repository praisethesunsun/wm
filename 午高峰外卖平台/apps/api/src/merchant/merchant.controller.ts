import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('merchant')
export class MerchantController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('stats')
  async getDashboardStats() {
    const orders = await this.prisma.order.findMany();
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completedOrders = orders.filter(o => o.status === 'PAID' || o.status === 'PENDING').length;

    // Build a mock time-series that react to real completed order counts for demo
    // Time distribution simulation
    return {
      totalRevenue,
      completedOrders,
      totalOrders: orders.length,
      trend: [
        { time: '11:00', orders: 12 },
        { time: '11:30', orders: 48 },
        { time: '12:00', orders: orders.length > 0 ? 150 + orders.length : 150 },
        { time: '12:30', orders: 85 },
      ]
    };
  }
}
