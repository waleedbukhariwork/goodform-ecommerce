import { Injectable, NotFoundException } from "@nestjs/common";
import { CatalogRepository } from "../infrastructure/catalog.repository.js";
import type { ProductDto } from "../presentation/catalog.dto.js";

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  private mapProduct(
    row: NonNullable<Awaited<ReturnType<CatalogRepository["bySlug"]>>>,
  ): ProductDto {
    return {
      slug: row.slug,
      name: row.name,
      description: row.description,
      category: row.category,
      color: row.color,
      priceCents: row.priceCents,
      imagePath: row.imagePath,
      sizes: row.sizes,
    };
  }

  async list(q: string | undefined, page: number, pageSize: number) {
    const { rows, total } = await this.repository.list(q, page, pageSize);
    return {
      items: rows.map((row) => this.mapProduct(row)),
      total,
      page,
      pageSize,
    };
  }

  async detail(slug: string) {
    const row = await this.repository.bySlug(slug);
    if (!row) throw new NotFoundException("Product not found");
    return this.mapProduct(row);
  }
}
