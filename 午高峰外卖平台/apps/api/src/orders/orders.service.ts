import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  async createOrder(idempotencyKey: string, items: { itemId: string; qty: number }[]) {
    // 1. Check Idempotency Key
    const existingOrder = await this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: { items: true },
    });
    
    if (existingOrder) {
      return existingOrder; // Return cached response
    }

    // 2. Perform Atomic Transaction (Inventory Check + Deduction + Order Creation)
    try {
      const order = await this.prisma.$transaction(async (tx) => {
        let totalAmount = 0;

        for (const reqItem of items) {
          // Lock the item or use optimistic locking (here we use select for simplicity in SQLite, 
          // in MySQL this would be a SELECT ... FOR UPDATE or Redis Lua script)
          const dbItem = await tx.item.findUnique({ where: { id: reqItem.itemId } });
          
          if (!dbItem) {
            throw new Error(`Item ${reqItem.itemId} not found`);
          }
          if (dbItem.stock < reqItem.qty) {
            throw new Error(`Insufficient stock for ${dbItem.name}`);
          }

          // Deduct stock
          await tx.item.update({
            where: { id: dbItem.id },
            data: { stock: { decrement: reqItem.qty } },
          });

          totalAmount += dbItem.price * reqItem.qty;
        }

        // Create the order
        const newOrder = await tx.order.create({
          data: {
            idempotencyKey,
            totalAmount,
            status: 'PENDING',
            items: {
              create: items.map((i) => ({
                itemId: i.itemId,
                qty: i.qty,
              })),
            },
          },
          include: { items: true },
        });

        return newOrder;
      });

      // Sandbox Mock: BullMQ and Redis are stripped. We just return the order synchronously.
      return order;
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.CONFLICT);
    }
  }
}
