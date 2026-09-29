import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { OwnerRequest } from "../../identity/index.js";
import { OrdersService } from "../application/orders.service.js";
import { OrderDto, OrderParam, PrepareOrderDto } from "./orders.dto.js";

@ApiTags("orders")
@Controller("api/v1/orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post("prepare")
  @ApiOkResponse({ type: OrderDto })
  prepare(@Req() request: OwnerRequest, @Body() body: PrepareOrderDto) {
    return this.orders.prepare(request.ownerId!, body.reservationId);
  }

  @Get(":id")
  @ApiOkResponse({ type: OrderDto })
  detail(@Req() request: OwnerRequest, @Param() param: OrderParam) {
    return this.orders.detail(request.ownerId!, param.id);
  }
}
