import { spawnSync, spawn } from "node:child_process";

const initial = spawnSync("tsc", ["-p", "tsconfig.json"], { stdio: "inherit" });
if (initial.status !== 0) process.exit(initial.status ?? 1);
const compiler = spawn("tsc", ["-w", "-p", "tsconfig.json"], {
  stdio: "inherit",
});
const server = spawn(process.execPath, ["--watch", "dist/src/main.js"], {
  stdio: "inherit",
});
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  compiler.kill("SIGTERM");
  server.kill("SIGTERM");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => {
  stop();
  process.exitCode = code ?? 0;
});
compiler.on("exit", (code) => {
  stop();
  process.exitCode = code ?? 0;
});
