import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { InferenceConfig } from "../infrastructure/inference.config.js";
import { InferenceBudgetRepository } from "../infrastructure/inference-budget.repository.js";
import {
  GoogleTryOnAdapter,
  type ProbeImage,
} from "../infrastructure/google-try-on.adapter.js";

const imageLimit = 7 * 1024 * 1024;
async function loadImage(path: string): Promise<ProbeImage> {
  const bytes = await readFile(path);
  if (!bytes.length || bytes.length > imageLimit)
    throw new Error("Invalid source image");
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg =
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9;
  if (!png && !jpeg) throw new Error("Invalid source image");
  return { bytes, mimeType: png ? "image/png" : "image/jpeg" };
}

export type ProbeObservation = {
  run: number;
  modelId: string;
  startedAt: string;
  endedAt: string;
  latencyMs: number;
  providerStatus: "completed" | "error";
  estimatedCostCents: number;
  requestId: string;
  humanReviewed: false;
  defectNotes: null;
};

export async function runProbe(
  config: InferenceConfig,
  personPath: string,
  productPath: string,
  outputDir: string,
  approvedMaxCents: number,
  databaseUrl: string,
) {
  if (
    !isAbsolute(outputDir) ||
    resolve(outputDir).startsWith(resolve(process.cwd()) + "/")
  )
    throw new Error(
      "Private output directory must be absolute and outside the repository",
    );
  if (
    config.dailyCallCap !== 6 ||
    config.perCallCostCeilingCents < 6 ||
    approvedMaxCents !== 36
  )
    throw new Error("Probe budget gate is not satisfied");
  const person = await loadImage(personPath);
  const product = await loadImage(productPath);
  await mkdir(outputDir, { recursive: true, mode: 0o700 });
  const adapter = new GoogleTryOnAdapter(config);
  const observations: ProbeObservation[] = [];
  const budget = new InferenceBudgetRepository(databaseUrl);
  try {
    for (let run = 1; run <= 6; run++) {
      if (!(await budget.reserve(config.project, config.dailyCallCap)))
        throw new Error("Daily inference call cap reached");
      const started = new Date();
      const requestId = randomUUID();
      let providerStatus: ProbeObservation["providerStatus"] = "error";
      try {
        // Aborting a client request may still be billable; every initiated call counts.
        const result = await adapter.generate(
          person,
          product,
          AbortSignal.timeout(45_000),
        );
        const suffix = result.mimeType === "image/png" ? "png" : "jpg";
        await writeFile(
          resolve(outputDir, `preview-${run}.${suffix}`),
          result.bytes,
          { mode: 0o600, flag: "wx" },
        );
        providerStatus = "completed";
      } catch {
        // Provider errors can include credential and image details; emit only status.
      }
      const ended = new Date();
      const observation: ProbeObservation = {
        run,
        modelId: config.modelId,
        startedAt: started.toISOString(),
        endedAt: ended.toISOString(),
        latencyMs: ended.getTime() - started.getTime(),
        providerStatus,
        estimatedCostCents: 6,
        requestId,
        humanReviewed: false,
        defectNotes: null,
      };
      observations.push(observation);
      process.stdout.write(
        JSON.stringify({ event: "inference_probe", ...observation }) + "\n",
      );
      if (providerStatus === "error") break;
    }
    return observations;
  } finally {
    await budget.close();
  }
}
