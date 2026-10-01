import Link from "next/link";
import { listProducts } from "../features/catalog/api";
import { CatalogCollection } from "../features/catalog/catalog-collection";
import { visibleProducts } from "../features/catalog/view";
import { Failure } from "../features/commerce/error";

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
  const first = visibleProducts(result.items, category, sort)[0];
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
      <CatalogCollection
        initialItems={result.items}
        initialTotal={result.total}
        initialQuery={q}
        initialCategory={category}
        initialSort={sort}
      />
    </main>
  );
}
