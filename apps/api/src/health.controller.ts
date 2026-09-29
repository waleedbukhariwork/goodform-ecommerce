import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import { Database } from "./db/database.js";

@Controller("api/v1/health")
export class HealthController {
  constructor(private readonly db: Database) {}
  @Get("live")
  @ApiOkResponse({ schema: { example: { status: "ok" } } })
  live() {
    return { status: "ok" };
  }
  @Get("ready")
  @ApiOkResponse({ schema: { example: { status: "ok" } } })
  async ready() {
    try {
      await this.db.ready();
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }
  }
}
