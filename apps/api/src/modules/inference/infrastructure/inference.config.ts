import { statSync } from "node:fs";
import { plainToInstance } from "class-transformer";
import { IsIn, IsInt, Matches, Max, Min, validateSync } from "class-validator";

const regions = [
  "us-central1",
  "us-east1",
  "us-east4",
  "us-east5",
  "us-south1",
  "us-west1",
  "us-west4",
  "northamerica-northeast1",
  "europe-west1",
  "europe-west4",
  "europe-west8",
  "europe-west9",
  "europe-southwest1",
  "europe-north1",
  "asia-northeast1",
  "asia-southeast1",
  "me-central1",
] as const;

class InferenceEnvironment {
  @Matches(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/) project!: string;
  @IsIn(regions) region!: (typeof regions)[number];
  @IsIn(["virtual-try-on-001"]) modelId!: "virtual-try-on-001";
  @Matches(/^\/.+/) credentialsFile!: string;
  @IsInt() @Min(6) @Max(100) perCallCostCeilingCents!: number;
  @IsInt() @Min(1) @Max(6) dailyCallCap!: number;
}

export type InferenceConfig = InferenceEnvironment;

export function inferenceConfig(
  environment: NodeJS.ProcessEnv = process.env,
): InferenceConfig | null {
  const enabled = environment.INFERENCE_ENABLED;
  if (enabled !== undefined && enabled !== "true" && enabled !== "false")
    throw new Error("Invalid inference configuration");
  if (enabled !== "true") return null;
  const config = plainToInstance(
    InferenceEnvironment,
    {
      project: environment.INFERENCE_GOOGLE_PROJECT,
      region: environment.INFERENCE_GOOGLE_REGION,
      modelId: environment.INFERENCE_MODEL_ID,
      credentialsFile: environment.INFERENCE_GOOGLE_CREDENTIALS_FILE,
      perCallCostCeilingCents: Number(environment.INFERENCE_COST_CEILING_CENTS),
      dailyCallCap: Number(environment.INFERENCE_DAILY_CAP),
    },
    { enableImplicitConversion: false },
  );
  let fileValid = false;
  try {
    fileValid = statSync(config.credentialsFile).isFile();
  } catch {
    /* absent */
  }
  if (validateSync(config).length || !fileValid)
    throw new Error("Invalid inference configuration");
  return config;
}
