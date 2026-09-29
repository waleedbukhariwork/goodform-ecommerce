import { Module } from "@nestjs/common";
import { Database } from "../../db/database.js";
import { CartsModule } from "../carts/index.js";
import { InventoryService } from "./application/inventory.service.js";
import { InventoryRepository } from "./infrastructure/inventory.repository.js";
import { InventoryController } from "./presentation/inventory.controller.js";

@Module({
  imports: [CartsModule],
  controllers: [InventoryController],
  providers: [Database, InventoryRepository, InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
