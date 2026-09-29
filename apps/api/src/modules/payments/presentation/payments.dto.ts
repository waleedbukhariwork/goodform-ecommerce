import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class CheckoutRequestDto {
  @ApiProperty({ type: String })
  @IsUUID("4")
  reservationId!: string;
}
export class CheckoutResponseDto {
  @ApiProperty({ type: String }) orderId!: string;
  @ApiProperty({ type: String }) url!: string;
  @ApiProperty({ type: String }) status!: string;
}
export class ReconcileOrderParam {
  @IsUUID("4") id!: string;
}
