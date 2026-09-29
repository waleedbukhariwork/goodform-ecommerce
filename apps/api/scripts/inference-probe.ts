import { apiConfig } from "../src/config.js";
import { inferenceConfig } from "../src/modules/inference/infrastructure/inference.config.js";
import { runProbe } from "../src/modules/inference/application/probe.js";

async function main() {
  const config = inferenceConfig();
  if (process.argv.includes("--preflight")) {
    process.stdout.write(
      JSON.stringify({
        event: "inference_preflight",
        enabled: Boolean(config),
        modelId: config?.modelId ?? null,
      }) + "\n",
    );
    return;
  }
  if (!config) throw new Error("Inference integration is disabled");
  const args = process.argv.slice(2);
  const value = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const person = value("--person");
  const product = value("--product");
  const output = value("--out-dir");
  const approved = Number(value("--approved-max-cents"));
  if (!person || !product || !output || !Number.isInteger(approved))
    throw new Error("Required probe arguments are missing");
  await runProbe(
    config,
    person,
    product,
    output,
    approved,
    apiConfig().DATABASE_URL,
  );
}
main().catch(() => {
  process.stderr.write(
    "Inference probe unavailable; check private configuration and approval\n",
  );
  process.exitCode = 1;
});
