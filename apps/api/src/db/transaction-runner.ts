import { Injectable } from "@nestjs/common";
import { Database } from "./database.js";

export type CommerceTransaction = Parameters<
  Parameters<Database["client"]["transaction"]>[0]
>[0];

@Injectable()
export class TransactionRunner {
  constructor(private readonly database: Database) {}

  run<T>(operation: (transaction: CommerceTransaction) => Promise<T>) {
    return this.database.client.transaction(operation);
  }
}
