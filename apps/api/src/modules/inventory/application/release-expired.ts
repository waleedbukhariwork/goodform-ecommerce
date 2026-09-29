import { Database } from "../../../db/database.js";
import { InventoryRepository } from "../infrastructure/inventory.repository.js";

export function releaseExpiredReservations(database: Database) {
  return new InventoryRepository(database).releaseExpired();
}
