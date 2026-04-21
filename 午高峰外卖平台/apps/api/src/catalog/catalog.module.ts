import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CatalogController],
  providers: [PrismaService],
})
export class CatalogModule {}
