import "reflect-metadata";
import { readFile, writeFile } from "node:fs/promises";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import openapiTS, { astToString } from "openapi-typescript";
import { ContractsModule } from "../src/contracts.module.js";

const app = await NestFactory.create(ContractsModule, { logger: false });
const document = SwaggerModule.createDocument(
  app,
  new DocumentBuilder().setTitle("Goodform API").setVersion("1").build(),
);
const generated = astToString(
  await openapiTS(document as unknown as Parameters<typeof openapiTS>[0]),
);
const path = new URL(
  "../../../packages/api-contracts/src/generated.ts",
  import.meta.url,
);
if (process.argv.includes("--check")) {
  const existing = await readFile(path, "utf8").catch(() => "");
  if (existing !== generated) {
    process.stderr.write("Generated API contract has drifted\n");
    process.exitCode = 1;
  }
} else await writeFile(path, generated);
await app.close();
