import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { CartService } from "./modules/carts/index.js";
import { CartController } from "./modules/carts/presentation/cart.controller.js";
import { OrdersService } from "./modules/orders/index.js";
import { OrdersController } from "./modules/orders/presentation/orders.controller.js";
import { InventoryService } from "./modules/inventory/index.js";
import { InventoryController } from "./modules/inventory/presentation/inventory.controller.js";
import { CatalogService } from "./modules/catalog/application/catalog.service.js";
import { CatalogController } from "./modules/catalog/presentation/catalog.controller.js";
import { Database } from "./db/database.js";

// Metadata-only module keeps contract generation independent of runtime credentials.
@Module({
  controllers: [
    CatalogController,
    CartController,
    InventoryController,
    OrdersController,
    HealthController,
  ],
  providers: [
    { provide: CatalogService, useValue: {} },
    { provide: CartService, useValue: {} },
    { provide: InventoryService, useValue: {} },
    { provide: OrdersService, useValue: {} },
    { provide: Database, useValue: {} },
  ],
})
export class ContractsModule {}
