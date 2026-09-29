import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from "class-validator";

export class PutCartItemDto {
  @ApiProperty({ type: String })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiProperty({ type: String })
  @IsString()
  @Matches(/^(S|M|L)$/)
  size!: string;

  @ApiProperty({ type: Number, minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  quantity!: number;

  // Accepted for compatibility with price-bearing clients, never used by the server.
  @ApiPropertyOptional({
    type: Number,
    description: "Ignored; the server uses catalog price.",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;
}

export class CartItemParam {
  @IsUUID("4") id!: string;
}

export class CartItemDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) slug!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) imagePath!: string;
  @ApiProperty({ type: String }) size!: string;
  @ApiProperty({ type: Number }) quantity!: number;
  @ApiProperty({ type: Number }) unitPriceCents!: number;
  @ApiProperty({ type: Number }) lineTotalCents!: number;
}

export class CartDto {
  @ApiProperty({ type: [CartItemDto] }) items!: CartItemDto[];
  @ApiProperty({ type: Number }) totalCents!: number;
}
