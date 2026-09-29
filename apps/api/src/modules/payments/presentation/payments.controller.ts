import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { OwnerRequest } from "../../identity/index.js";
import { OrderDto } from "../../orders/index.js";
import { PaymentsService } from "../application/payments.service.js";
import {
  CheckoutRequestDto,
  CheckoutResponseDto,
  ReconcileOrderParam,
} from "./payments.dto.js";

@ApiTags("payments")
@Controller("api/v1")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("checkout")
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    description: "Client-generated UUID v4",
  })
  @ApiCreatedResponse({ type: CheckoutResponseDto })
  checkout(
    @Req() request: OwnerRequest,
    @Headers("idempotency-key") key: string | undefined,
    @Body() body: CheckoutRequestDto,
  ) {
    if (
      !key ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key,
      )
    )
      throw new BadRequestException("Idempotency-Key must be a UUID v4");
    return this.payments.checkout(request.ownerId!, body.reservationId, key);
  }

  @Post("orders/:id/reconcile")
  @ApiOkResponse({ type: OrderDto })
  reconcile(@Req() request: OwnerRequest, @Param() param: ReconcileOrderParam) {
    return this.payments.reconcile(request.ownerId!, param.id);
  }
}
