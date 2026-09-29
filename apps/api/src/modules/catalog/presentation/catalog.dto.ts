import { Transform } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ListProductsQuery {
  @ApiPropertyOptional({ type: String, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 24, default: 12 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(24)
  pageSize = 12;
}

export class SlugParam {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug!: string;
}

export class SizeDto {
  @ApiProperty({ type: String }) size!: string;
  @ApiProperty({ type: Number }) chestCm!: number;
  @ApiProperty({ type: Number }) lengthCm!: number;
  @ApiProperty({ type: Number }) shoulderCm!: number;
}

export class ProductDto {
  @ApiProperty({ type: String }) slug!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: String }) category!: string;
  @ApiProperty({ type: String }) color!: string;
  @ApiProperty({ type: Number }) priceCents!: number;
  @ApiProperty({ type: String }) imagePath!: string;
  @ApiProperty({ type: [SizeDto] }) sizes!: SizeDto[];
}

export class ProductListDto {
  @ApiProperty({ type: [ProductDto] }) items!: ProductDto[];
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) pageSize!: number;
}
