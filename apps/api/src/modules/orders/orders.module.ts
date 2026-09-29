import { Module } from "@nestjs/common";
import { Database } from "../../db/database.js";
import { CartsModule } from "../carts/index.js";
import { InventoryModule } from "../inventory/index.js";
import { OrdersService } from "./application/orders.service.js";
import { OrdersRepository } from "./infrastructure/orders.repository.js";
import { OrdersController } from "./presentation/orders.controller.js";

@Module({
  imports: [CartsModule, InventoryModule],
  controllers: [OrdersController],
  providers: [Database, OrdersRepository, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
