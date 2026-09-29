import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { OwnerRequest } from "../../identity/index.js";
import { InventoryService } from "../application/inventory.service.js";
import {
  EmptyReservationDto,
  ReservationDto,
  ReservationParam,
} from "./inventory.dto.js";

@ApiTags("inventory")
@Controller("api/v1/reservations")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post()
  @ApiOkResponse({ type: ReservationDto })
  reserve(@Req() request: OwnerRequest, @Body() body: EmptyReservationDto) {
    if (Object.keys(body ?? {}).length)
      throw new BadRequestException("Unexpected reservation input");
    return this.inventory.reserveCart(request.ownerId!);
  }

  @Get(":id")
  @ApiOkResponse({ type: ReservationDto })
  detail(@Req() request: OwnerRequest, @Param() param: ReservationParam) {
    return this.inventory.detail(request.ownerId!, param.id);
  }
}
