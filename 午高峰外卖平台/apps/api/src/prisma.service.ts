import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    
    // Auto-seed for sandbox environment
    const count = await this.item.count();
    if (count === 0) {
      await Promise.all([
        this.item.create({ data: { name: '招牌卤肉饭', price: 25.0, stock: 100 } }),
        this.item.create({ data: { name: '手撕包菜', price: 15.0, stock: 50 } }),
        this.item.create({ data: { name: '湖南农家小炒肉', price: 28.0, stock: 30 } }),
        this.item.create({ data: { name: '冰镇可乐', price: 3.5, stock: 200 } })
      ]);
      console.log('Database seeded with initial lunch items.');
    }
  }
}
