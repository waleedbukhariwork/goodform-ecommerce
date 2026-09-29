import { apiConfig } from "../src/config.js";
import { mailSendAttempts } from "../src/db/schema.js";
import { Database } from "../src/db/database.js";
import {
  MailThrottle,
  MailCooldownError,
} from "../src/modules/identity/infrastructure/mail-throttle.js";

const config = apiConfig();
const database = new Database({ ...config } as never);
const throttle = new MailThrottle(database);
const email = "throttle-probe@example.com";
const other = "someone-else@example.com";

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  ok   ${label}`);
  else {
    console.log(`  FAIL ${label}`);
    failures += 1;
  }
}

console.log("mail throttle behaviour");
check(
  "no prior attempt leaves 0 remaining",
  (await throttle.remaining("verification", email)) === 0,
);
await throttle.claim("verification", email);
const afterFirst = await throttle.remaining("verification", email);
check("first claim leaves a real cooldown", afterFirst > 0 && afterFirst <= 60);

let refused = false;
try {
  await throttle.claim("verification", email);
} catch (error) {
  refused = error instanceof MailCooldownError;
}
check("second claim in the same window is refused", refused);

const otherRemaining = await throttle.remaining("verification", other);
check("a different address is unaffected", otherRemaining === 0);

let resetRefused = false;
try {
  await throttle.claim("reset", email);
} catch {
  resetRefused = true;
}
check("reset kind has its own window", !resetRefused);

const rows = await database.client.select().from(mailSendAttempts);
check("no raw address is stored", !JSON.stringify(rows).includes(email));
check("row count matches claims", rows.length === 2);

await database.client.delete(mailSendAttempts);
const emptied = await database.client.select().from(mailSendAttempts);
check("cleanup removed the probe rows", emptied.length === 0);

console.log(
  failures === 0
    ? "\nall throttle checks passed"
    : `\n${failures} check(s) failed`,
);
await database.pool.end();
process.exit(failures === 0 ? 0 : 1);
