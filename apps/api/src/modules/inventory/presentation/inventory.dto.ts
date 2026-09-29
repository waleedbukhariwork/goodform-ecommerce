import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class ReservationParam {
  @IsUUID("4") id!: string;
}
export class EmptyReservationDto {}
export class ReservationItemDto {
  @ApiProperty({ type: String }) productId!: string;
  @ApiProperty({ type: String }) size!: string;
  @ApiProperty({ type: Number }) quantity!: number;
}
export class ReservationDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) status!: string;
  @ApiProperty({ type: String }) expiresAt!: string;
  @ApiProperty({ type: [ReservationItemDto] }) items!: ReservationItemDto[];
}
