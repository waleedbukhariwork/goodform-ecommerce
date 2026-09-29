import { Controller, Get, Query } from "@nestjs/common";
import { isEmail } from "class-validator";
import {
  MailThrottle,
  type MailKind,
} from "../infrastructure/mail-throttle.js";

/**
 * Lets the client render a countdown that matches server truth. The value is
 * advisory: the throttle is enforced on the send path regardless, so a tampered
 * value can only misreport a button, never bypass the limit.
 */
@Controller("api/v1/auth/mail-cooldown")
export class MailCooldownController {
  constructor(private readonly throttle: MailThrottle) {}

  @Get()
  async remaining(
    @Query("email") email: string,
    @Query("kind") kind: string = "verification",
  ) {
    const normalized: MailKind = kind === "reset" ? "reset" : "verification";
    if (typeof email !== "string" || !isEmail(email)) {
      return { kind: normalized, retryAfterSeconds: 0 };
    }
    return {
      kind: normalized,
      retryAfterSeconds: await this.throttle.remaining(normalized, email),
    };
  }
}
