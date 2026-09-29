import Link from "next/link";
import { listProducts } from "../features/catalog/api";
import { ProductMedia } from "../components/ui/product-media";
import { Icon } from "../components/ui/icon";
import { formatMoney } from "../lib/money";
import { Failure } from "../features/commerce/error";
import { CatalogSearch } from "../features/catalog/catalog-search";

type Search = { q?: string; category?: string; sort?: string };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { q = "", category = "all", sort = "featured" } = await searchParams;
  let result;
  try {
    result = await listProducts(q);
  } catch (error) {
    return (
      <main id="main" className="shell page-shell">
        <p className="eyebrow">The collection</p>
        <h1 className="page-heading">Collection unavailable</h1>
        <Failure error={error} />
        <Link className="button secondary" href="/">
          Try again
        </Link>
      </main>
    );
  }
  const categories = [
    ...new Set(result.items.map((item) => item.category)),
  ].sort();
  const items = result.items.filter(
    (item) => category === "all" || item.category === category,
  );
  if (sort === "price-low")
    items.sort(
      (a, b) => a.priceCents - b.priceCents || a.name.localeCompare(b.name),
    );
  if (sort === "price-high")
    items.sort(
      (a, b) => b.priceCents - a.priceCents || a.name.localeCompare(b.name),
    );
  const first = items[0];
  const preload = first?.imagePath.endsWith("-v2-1200.jpg")
    ? first.imagePath.replace("-1200.jpg", "-480.webp")
    : undefined;
  const preloadLarge = preload?.replace("-480.webp", "-1200.webp");
  return (
    <main id="main" className="shell">
      {preload && (
        <link
          rel="preload"
          as="image"
          href={preload}
          type="image/webp"
          imageSrcSet={`${preload} 480w, ${preloadLarge} 1200w`}
          imageSizes="(max-width: 639px) calc(100vw - 32px), (max-width: 999px) calc((100vw - 48px) / 2), 360px"
        />
      )}
      <section className="catalog-intro" aria-labelledby="collection-title">
        <div>
          <span className="eyebrow">Goodform / Fitting notes / 01</span>
          <h1 id="collection-title" className="display">
            Clothes worth looking closer at.
          </h1>
        </div>
        <aside>
          <p>
            Eight everyday layers, shown with garment measurements so you can
            compare before you choose.
          </p>
          <p className="reference-note">
            This is a demonstration collection. Prices and measurements are
            fictional; photographs are references.
          </p>
        </aside>
      </section>
      <section aria-labelledby="garments-heading">
        <div className="catalog-toolbar">
          <h2 id="garments-heading">
            The collection{" "}
            <span>
              {items.length} of {result.total} garments
            </span>
          </h2>
          <CatalogSearch initialQuery={q} />
        </div>
        {result.items.length > 0 && (
          <form
            action="/"
            method="get"
            className="catalog-filters"
            aria-label="Collection filters"
          >
            <input type="hidden" name="q" value={q} />
            <label className="form-field">
              Category
              <select name="category" defaultValue={category}>
                <option value="all">All garments</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Sort by
              <select name="sort" defaultValue={sort}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
            <button type="submit" className="secondary">
              Apply
            </button>
          </form>
        )}
        {items.length ? (
          <div className="catalog-grid">
            {items.map((product, index) => (
              <Link
                className="product-card"
                key={product.slug}
                href={`/products/${product.slug}`}
              >
                <ProductMedia
                  src={product.imagePath}
                  alt={`Reference photograph for ${product.name}`}
                  sizes="(max-width: 360px) 288px, (max-width: 768px) 45vw, (max-width: 1024px) 30vw, 22vw"
                  priority={index === 0}
                />
                <div className="product-card-copy">
                  <span className="eyebrow">
                    {product.category} / {product.color}
                  </span>
                  <h3>{product.name}</h3>
                  <p className="price">{formatMoney(product.priceCents)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <span className="eyebrow">No match in this edit</span>
            <h3>Nothing fits that search.</h3>
            <p>Try another name or view all eight garments.</p>
            <Link className="button" href="/">
              Clear search and filters <Icon name="arrow-right" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
