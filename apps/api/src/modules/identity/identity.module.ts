import { Module } from "@nestjs/common";
import { Database } from "../../db/database.js";
import { IdentityService } from "./application/identity.service.js";

@Module({
  providers: [Database, IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
