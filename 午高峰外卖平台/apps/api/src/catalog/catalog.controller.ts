import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('catalog')
export class CatalogController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('menu')
  async getMenu() {
    // Fetches real items from database
    return this.prisma.item.findMany();
  }
}
