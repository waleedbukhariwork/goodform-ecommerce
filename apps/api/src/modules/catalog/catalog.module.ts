import { Module } from "@nestjs/common";
import { Database } from "../../db/database.js";
import { CatalogService } from "./application/catalog.service.js";
import { CatalogRepository } from "./infrastructure/catalog.repository.js";
import { CatalogController } from "./presentation/catalog.controller.js";

@Module({
  controllers: [CatalogController],
  providers: [Database, CatalogRepository, CatalogService],
})
export class CatalogModule {}
