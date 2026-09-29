import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { runtimeConfig } from "./config.js";
import { Database } from "./db/database.js";
import { HealthController } from "./health.controller.js";
import { CartsModule } from "./modules/carts/index.js";
import { InventoryModule } from "./modules/inventory/index.js";
import { IdentityModule } from "./modules/identity/index.js";
import { CatalogModule } from "./modules/catalog/catalog.module.js";
import { observeImports } from "./observe.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [runtimeConfig],
    }),
    ...observeImports(),
    CatalogModule,
    IdentityModule,
    CartsModule,
    InventoryModule,
  ],
  controllers: [HealthController],
  providers: [Database],
})
export class AppModule {}
