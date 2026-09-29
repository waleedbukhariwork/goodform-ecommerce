import { Module } from "@nestjs/common";
import { Database } from "../../db/database.js";
import { TransactionRunner } from "../../db/transaction-runner.js";
import { InventoryModule } from "../inventory/index.js";
import { OrdersModule } from "../orders/index.js";
import { PaymentsService } from "./application/payments.service.js";
import { PaymentsRepository } from "./infrastructure/payments.repository.js";
import { PaymentsController } from "./presentation/payments.controller.js";

@Module({
  imports: [OrdersModule, InventoryModule],
  controllers: [PaymentsController],
  providers: [Database, TransactionRunner, PaymentsRepository, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
