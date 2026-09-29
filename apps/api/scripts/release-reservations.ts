import { apiConfig } from "../src/config.js";
import { Database } from "../src/db/database.js";
import { releaseExpiredReservations } from "../src/modules/inventory/index.js";

const database = new Database(apiConfig());
try {
  const count = await releaseExpiredReservations(database);
  process.stdout.write(`Released ${count} expired reservations\n`);
} finally {
  await database.onModuleDestroy();
}
