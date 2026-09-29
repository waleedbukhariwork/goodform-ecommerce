import { registerAs } from "@nestjs/config";
import { plainToInstance } from "class-transformer";
import { IsIn, IsInt, IsString, Max, Min, validateSync } from "class-validator";

class ApiEnvironment {
  @IsIn(["dev", "staging", "production"]) APP_ENV!: string;
  @IsString() DATABASE_URL!: string;
  @IsInt() @Min(1) @Max(65535) PORT!: number;
}

export function apiConfig(environment: NodeJS.ProcessEnv = process.env) {
  const config = plainToInstance(ApiEnvironment, {
    APP_ENV: environment.APP_ENV ?? "dev",
    DATABASE_URL: environment.DATABASE_URL,
    PORT: Number(environment.PORT ?? 4000),
  });
  if (
    validateSync(config).length ||
    !/^postgres(ql)?:\/\//.test(config.DATABASE_URL ?? "")
  ) {
    throw new Error(
      "Invalid API configuration: APP_ENV, DATABASE_URL and PORT are required",
    );
  }
  return config;
}

export const runtimeConfig = registerAs("runtime", () => apiConfig());
