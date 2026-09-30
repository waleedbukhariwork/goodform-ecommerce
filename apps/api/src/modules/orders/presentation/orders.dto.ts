import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class OrderParam {
  @IsUUID("4") id!: string;
}
export class PrepareOrderDto {
  @IsUUID("4") reservationId!: string;
}
export class OrderLineDto {
  @ApiProperty({ type: String }) slug!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) imagePath!: string;
  @ApiProperty({ type: String }) size!: string;
  @ApiProperty({ type: Number }) quantity!: number;
  @ApiProperty({ type: Number }) unitPriceCents!: number;
  @ApiProperty({ type: Number }) lineTotalCents!: number;
}
export class OrderDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) status!: string;
  @ApiProperty({ type: Number }) totalCents!: number;
  @ApiProperty({ type: String }) createdAt!: string;
  @ApiProperty({ type: [OrderLineDto] }) items!: OrderLineDto[];
}
export class OrderSummaryDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) status!: string;
  @ApiProperty({ type: Number }) totalCents!: number;
  @ApiProperty({ type: String }) createdAt!: string;
  @ApiProperty({ type: Number }) itemCount!: number;
}
export class OrderListDto {
  @ApiProperty({ type: [OrderSummaryDto] }) items!: OrderSummaryDto[];
}
