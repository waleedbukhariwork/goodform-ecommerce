import { Controller, Get, Headers, Param, Query, Res } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { createHash } from "node:crypto";
import type { Response } from "express";
import { CatalogService } from "../application/catalog.service.js";
import {
  ListProductsQuery,
  ProductDto,
  ProductListDto,
  SlugParam,
} from "./catalog.dto.js";

function respond(
  response: Response,
  content: unknown,
  match: string | undefined,
) {
  const etag =
    '"' +
    createHash("sha256").update(JSON.stringify(content)).digest("hex") +
    '"';
  response.setHeader("ETag", etag);
  response.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  if (
    match
      ?.split(",")
      .some((tag) => [etag, "W/" + etag, "*"].includes(tag.trim()))
  ) {
    return response.status(304).end();
  }
  return response.json(content);
}

@ApiTags("catalog")
@Controller("api/v1/products")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOkResponse({ type: ProductListDto })
  async list(
    @Query() query: ListProductsQuery,
    @Headers("if-none-match") match: string | undefined,
    @Res() response: Response,
  ) {
    return respond(
      response,
      await this.catalog.list(query.q, query.page, query.pageSize),
      match,
    );
  }

  @Get(":slug")
  @ApiOkResponse({ type: ProductDto })
  async detail(
    @Param() param: SlugParam,
    @Headers("if-none-match") match: string | undefined,
    @Res() response: Response,
  ) {
    return respond(response, await this.catalog.detail(param.slug), match);
  }
}
