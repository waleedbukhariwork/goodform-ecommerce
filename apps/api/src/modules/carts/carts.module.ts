import { Module } from "@nestjs/common";
import { Database } from "../../db/database.js";
import { CatalogModule } from "../catalog/index.js";
import { CartService } from "./application/cart.service.js";
import { CartRepository } from "./infrastructure/cart.repository.js";
import { CartController } from "./presentation/cart.controller.js";

@Module({
  imports: [CatalogModule],
  controllers: [CartController],
  providers: [Database, CartRepository, CartService],
  exports: [CartService],
})
export class CartsModule {}
