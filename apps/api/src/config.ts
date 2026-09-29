import { registerAs } from "@nestjs/config";
import { readFileSync } from "node:fs";
import { plainToInstance } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Matches,
  Min,
  validateSync,
} from "class-validator";

class ApiEnvironment {
  @IsIn(["dev", "staging", "production"]) APP_ENV!:
    | "dev"
    | "staging"
    | "production";
  @IsIn(["development", "production"]) NODE_ENV!: "development" | "production";
  @IsString() DATABASE_URL!: string;
  @IsInt() @Min(1) @Max(65535) PORT!: number;
  @IsIn(["127.0.0.1", "0.0.0.0"]) BIND_ADDRESS!: string;
  @IsBoolean() OBSERVE_ENABLED!: boolean;
  @IsOptional() @IsString() OBSERVE_APP_KEY?: string;
  @IsOptional() @IsString() OBSERVE_APP_SECRET?: string;
  @IsOptional()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/)
  OBSERVE_SERVICE_ID?: string;
  @IsOptional() @IsString() OBSERVE_ENDPOINT?: string;
  @IsNumber() @Min(0) @Max(1) OBSERVE_SAMPLE_RATE!: number;
  @IsOptional() @Matches(/^[a-f0-9]{7,40}$/) RELEASE_SHA?: string;
  @IsOptional() @IsString() SESSION_KEY_FILE?: string;
  @IsOptional() @Matches(/^[a-z][a-z0-9_-]{2,63}$/) MEDIA_NAMESPACE?: string;
}

export function apiConfig(environment: NodeJS.ProcessEnv = process.env) {
  const appEnv = environment.APP_ENV ?? "dev";
  const observeEnabled =
    environment.OBSERVE_ENABLED === undefined
      ? false
      : environment.OBSERVE_ENABLED === "true"
        ? true
        : environment.OBSERVE_ENABLED === "false"
          ? false
          : undefined;
  const config = plainToInstance(ApiEnvironment, {
    APP_ENV: appEnv,
    NODE_ENV:
      environment.NODE_ENV ?? (appEnv === "dev" ? "development" : undefined),
    DATABASE_URL:
      environment.DATABASE_URL ??
      (environment.DATABASE_URL_FILE
        ? readFileSync(environment.DATABASE_URL_FILE, "utf8").trim()
        : undefined),
    PORT: Number(environment.PORT ?? 4000),
    BIND_ADDRESS:
      environment.BIND_ADDRESS ?? (appEnv === "dev" ? "127.0.0.1" : "0.0.0.0"),
    OBSERVE_ENABLED: observeEnabled,
    OBSERVE_APP_KEY: environment.OBSERVE_APP_KEY,
    OBSERVE_APP_SECRET: environment.OBSERVE_APP_SECRET,
    OBSERVE_SERVICE_ID: environment.OBSERVE_SERVICE_ID,
    OBSERVE_ENDPOINT: environment.OBSERVE_ENDPOINT,
    OBSERVE_SAMPLE_RATE: Number(environment.OBSERVE_SAMPLE_RATE ?? 0.05),
    RELEASE_SHA: environment.RELEASE_SHA,
    SESSION_KEY_FILE: environment.SESSION_KEY_FILE,
    MEDIA_NAMESPACE: environment.MEDIA_NAMESPACE,
  });
  let databaseValid = false;
  try {
    const url = new URL(config.DATABASE_URL);
    databaseValid =
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      Boolean(url.hostname && url.username && url.pathname.length > 1);
  } catch {
    /* invalid URL */
  }
  let namespaceValid = true;
  let sessionKeyValid = true;
  if (appEnv !== "dev") {
    namespaceValid = Boolean(config.MEDIA_NAMESPACE?.startsWith(appEnv));
    try {
      sessionKeyValid = Boolean(
        config.SESSION_KEY_FILE &&
          readFileSync(config.SESSION_KEY_FILE, "utf8").trim().length >= 32,
      );
    } catch {
      sessionKeyValid = false;
    }
    try {
      const name = new URL(config.DATABASE_URL).pathname.slice(1);
      databaseValid = databaseValid && name.includes(appEnv);
    } catch {
      databaseValid = false;
    }
  }
  let endpointValid = true;
  if (config.OBSERVE_ENDPOINT) {
    try {
      const url = new URL(config.OBSERVE_ENDPOINT);
      endpointValid =
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash &&
        (url.protocol === "https:" ||
          (appEnv === "dev" &&
            url.protocol === "http:" &&
            ["127.0.0.1", "localhost"].includes(url.hostname)));
    } catch {
      endpointValid = false;
    }
  }
  if (
    validateSync(config).length ||
    !databaseValid ||
    Boolean(environment.DATABASE_URL && environment.DATABASE_URL_FILE) ||
    !endpointValid ||
    !namespaceValid ||
    !sessionKeyValid ||
    (appEnv !== "dev" && config.NODE_ENV !== "production") ||
    (config.OBSERVE_ENABLED &&
      (!config.OBSERVE_APP_KEY ||
        !config.OBSERVE_APP_SECRET ||
        !config.OBSERVE_SERVICE_ID))
  ) {
    throw new Error("Invalid API runtime configuration");
  }
  return config;
}

export const runtimeConfig = registerAs("runtime", () => apiConfig());
