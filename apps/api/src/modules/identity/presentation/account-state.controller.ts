import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Req,
} from "@nestjs/common";
import { isEmail } from "class-validator";
import type { Request } from "express";
import { IdentityService } from "../application/identity.service.js";
import { allowLookup } from "../domain/account-state.js";

@Controller("api/v1/auth/account-state")
export class AccountStateController {
  private readonly buckets = new Map<
    string,
    { count: number; reset: number }
  >();

  constructor(private readonly identity: IdentityService) {}

  @Get()
  async read(@Query("email") email: string, @Req() request: Request) {
    const key = request.ip || request.socket?.remoteAddress || "unknown";
    if (!allowLookup(this.buckets, key, Date.now())) {
      throw new HttpException(
        "Too many requests",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (typeof email !== "string" || !isEmail(email)) {
      throw new BadRequestException();
    }
    return { status: await this.identity.accountState(email) };
  }
}
