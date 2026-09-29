import { Module } from "@nestjs/common";
import { Database } from "../../db/database.js";
import { IdentityService } from "./application/identity.service.js";
import { ResendMailSender } from "./infrastructure/mail.sender.js";
import { MailThrottle } from "./infrastructure/mail-throttle.js";
import { MailCooldownController } from "./presentation/mail-cooldown.controller.js";

@Module({
  controllers: [MailCooldownController],
  providers: [Database, IdentityService, ResendMailSender, MailThrottle],
  exports: [IdentityService],
})
export class IdentityModule {}
