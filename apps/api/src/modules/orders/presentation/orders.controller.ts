import { Controller, Get, Param, Req } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { OwnerRequest } from "../../identity/index.js";
import { OrdersService } from "../application/orders.service.js";
import { OrderDto, OrderParam } from "./orders.dto.js";

@ApiTags("orders")
@Controller("api/v1/orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get(":id")
  @ApiOkResponse({ type: OrderDto })
  detail(@Req() request: OwnerRequest, @Param() param: OrderParam) {
    return this.orders.detail(request.ownerId!, param.id);
  }
}
