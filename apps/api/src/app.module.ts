import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { runtimeConfig } from "./config.js";
import { Database } from "./db/database.js";
import { HealthController } from "./health.controller.js";
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
  ],
  controllers: [HealthController],
  providers: [Database],
})
export class AppModule {}
