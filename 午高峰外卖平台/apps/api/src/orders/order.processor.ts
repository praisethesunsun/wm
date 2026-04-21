import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';

@Processor('order-processing')
export class OrderProcessor extends WorkerHost {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'process-order':
        await this.handlePaymentTimeout(job.data.orderId);
        break;
      default:
        console.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handlePaymentTimeout(orderId: string) {
    // Standard idempotent flow: check status => revert stock => mark CANCELLED
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) return;
      if (order.status !== 'PENDING') return; // Already paid or canceled

      console.log(`[Worker] Cancelling unpaid order: ${orderId}`);
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      // Revert inventory
      for (const item of order.items) {
        await tx.item.update({
          where: { id: item.itemId },
          data: { stock: { increment: item.qty } },
        });
      }
    });
  }
}
