import { Body, Controller, Delete, Get, Param, Put, Req } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { OwnerRequest } from "../../identity/index.js";
import { CartService } from "../application/cart.service.js";
import { CartDto, CartItemParam, PutCartItemDto } from "./cart.dto.js";

@ApiTags("cart")
@Controller("api/v1/cart")
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOkResponse({ type: CartDto })
  view(@Req() request: OwnerRequest) {
    return this.cart.view(request.ownerId!);
  }

  @Put("items")
  @ApiOkResponse({ type: CartDto })
  put(@Req() request: OwnerRequest, @Body() body: PutCartItemDto) {
    return this.cart.put(request.ownerId!, body.slug, body.size, body.quantity);
  }

  @Delete("items/:id")
  @ApiOkResponse({ type: CartDto })
  remove(@Req() request: OwnerRequest, @Param() param: CartItemParam) {
    return this.cart.remove(request.ownerId!, param.id);
  }
}
