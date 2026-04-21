import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';
import { CatalogModule } from './catalog/catalog.module';
import { MerchantModule } from './merchant/merchant.module';

@Module({
  imports: [
    OrdersModule,
    CatalogModule,
    MerchantModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
