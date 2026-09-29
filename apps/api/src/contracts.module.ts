import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { CatalogService } from "./modules/catalog/application/catalog.service.js";
import { CatalogController } from "./modules/catalog/presentation/catalog.controller.js";
import { Database } from "./db/database.js";

// Metadata-only module keeps contract generation independent of runtime credentials.
@Module({
  controllers: [CatalogController, HealthController],
  providers: [
    { provide: CatalogService, useValue: {} },
    { provide: Database, useValue: {} },
  ],
})
export class ContractsModule {}
