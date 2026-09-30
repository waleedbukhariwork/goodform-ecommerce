import { registerAs } from "@nestjs/config";
import { inferenceConfig } from "./modules/inference/infrastructure/inference.config.js";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
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

const developmentSessionSecret = randomBytes(32).toString("base64url");

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
  @IsString() SESSION_SECRET!: string;
  @IsOptional() @IsString() PUBLIC_ORIGIN?: string;
  @IsOptional() @IsString() STRIPE_SECRET_KEY_FILE?: string;
  @IsOptional() @IsString() STRIPE_WEBHOOK_SECRET_FILE?: string;
  @IsOptional() @IsString() STRIPE_SECRET_KEY?: string;
  @IsOptional() @IsString() STRIPE_WEBHOOK_SECRET?: string;
  @IsOptional() @Matches(/^[a-z][a-z0-9_-]{2,63}$/) MEDIA_NAMESPACE?: string;
  @IsBoolean() MAIL_ENABLED!: boolean;
  @IsOptional() @IsString() RESEND_API_KEY_FILE?: string;
  @IsOptional() @IsString() RESEND_API_KEY?: string;
  @IsOptional() @IsString() MAIL_FROM?: string;
}

export function apiConfig(environment: NodeJS.ProcessEnv = process.env) {
  inferenceConfig(environment);
  const appEnv = environment.APP_ENV ?? "dev";
  const observeEnabled =
    environment.OBSERVE_ENABLED === undefined
      ? false
      : environment.OBSERVE_ENABLED === "true"
        ? true
        : environment.OBSERVE_ENABLED === "false"
          ? false
          : undefined;
  // Dev never sends. Staging and production send only when MAIL_ENABLED=true,
  // which the release overlay sets explicitly. Verification stays tied to that
  // flag so an environment that cannot send cannot lock new accounts out.
  const mailEnabled = appEnv !== "dev" && environment.MAIL_ENABLED === "true";
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
    SESSION_SECRET: developmentSessionSecret,
    PUBLIC_ORIGIN:
      environment.PUBLIC_ORIGIN ??
      (appEnv === "dev" ? "http://127.0.0.1:8080" : undefined),
    MEDIA_NAMESPACE: environment.MEDIA_NAMESPACE,
    STRIPE_SECRET_KEY_FILE: environment.STRIPE_SECRET_KEY_FILE,
    STRIPE_WEBHOOK_SECRET_FILE: environment.STRIPE_WEBHOOK_SECRET_FILE,
    MAIL_ENABLED: mailEnabled,
    RESEND_API_KEY_FILE: environment.RESEND_API_KEY_FILE,
    RESEND_API_KEY: environment.RESEND_API_KEY,
    MAIL_FROM: environment.MAIL_FROM,
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
  if (config.SESSION_KEY_FILE) {
    try {
      const secret = readFileSync(config.SESSION_KEY_FILE, "utf8").trim();
      sessionKeyValid =
        secret.length >= 32 &&
        [...secret].every((character) => character.charCodeAt(0) >= 32);
      if (sessionKeyValid) config.SESSION_SECRET = secret;
    } catch {
      sessionKeyValid = false;
    }
  }
  if (appEnv !== "dev") {
    namespaceValid = Boolean(config.MEDIA_NAMESPACE?.startsWith(appEnv));
    sessionKeyValid = sessionKeyValid && Boolean(config.SESSION_KEY_FILE);
    try {
      const name = new URL(config.DATABASE_URL).pathname.slice(1);
      databaseValid = databaseValid && name.includes(appEnv);
    } catch {
      databaseValid = false;
    }
  }
  let stripeValid = true;
  try {
    if (config.STRIPE_SECRET_KEY_FILE) {
      const key = readFileSync(config.STRIPE_SECRET_KEY_FILE, "utf8").trim();
      stripeValid = /^(sk|rk)_test_[A-Za-z0-9]+$/.test(key);
      if (stripeValid) config.STRIPE_SECRET_KEY = key;
    }
    if (config.STRIPE_WEBHOOK_SECRET_FILE) {
      const secret = readFileSync(
        config.STRIPE_WEBHOOK_SECRET_FILE,
        "utf8",
      ).trim();
      stripeValid = stripeValid && /^whsec_[A-Za-z0-9]+$/.test(secret);
      if (stripeValid) config.STRIPE_WEBHOOK_SECRET = secret;
    }
  } catch {
    stripeValid = false;
  }
  if (
    appEnv !== "dev" &&
    Boolean(config.STRIPE_SECRET_KEY) !== Boolean(config.STRIPE_WEBHOOK_SECRET)
  )
    stripeValid = false;
  let publicOriginValid = true;
  if (config.PUBLIC_ORIGIN) {
    try {
      const url = new URL(config.PUBLIC_ORIGIN);
      publicOriginValid =
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
      publicOriginValid = false;
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
  let resendValid = true;
  if (config.MAIL_ENABLED) {
    try {
      if (config.RESEND_API_KEY_FILE) {
        const key = readFileSync(config.RESEND_API_KEY_FILE, "utf8").trim();
        resendValid = /^re_[A-Za-z0-9_]+$/.test(key);
        if (resendValid) config.RESEND_API_KEY = key;
      }
      resendValid = resendValid && Boolean(config.RESEND_API_KEY);
    } catch {
      resendValid = false;
    }
  }
  if (
    validateSync(config).length ||
    !databaseValid ||
    Boolean(environment.DATABASE_URL && environment.DATABASE_URL_FILE) ||
    !endpointValid ||
    !publicOriginValid ||
    !stripeValid ||
    !resendValid ||
    !namespaceValid ||
    !sessionKeyValid ||
    (appEnv !== "dev" && config.NODE_ENV !== "production") ||
    (config.OBSERVE_ENABLED &&
      (!config.OBSERVE_APP_KEY ||
        !config.OBSERVE_APP_SECRET ||
        !config.OBSERVE_SERVICE_ID)) ||
    (config.MAIL_ENABLED && !config.MAIL_FROM)
  ) {
    throw new Error("Invalid API runtime configuration");
  }
  return config;
}

export const runtimeConfig = registerAs("runtime", () => apiConfig());
