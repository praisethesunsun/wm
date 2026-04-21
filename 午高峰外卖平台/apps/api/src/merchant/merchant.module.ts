import { Module } from '@nestjs/common';
import { MerchantController } from './merchant.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [MerchantController],
  providers: [PrismaService],
})
export class MerchantModule {}
