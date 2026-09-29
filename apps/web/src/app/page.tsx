import Link from "next/link";
import { listProducts } from "../features/catalog/api";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  let result;
  try {
    result = await listProducts(q);
  } catch {
    return (
      <main className="shell">
        <h1>Collection unavailable</h1>
        <p>We could not load the catalog right now.</p>
        <Link href="/">Try again</Link>
      </main>
    );
  }
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">GOODFORM / EDITION 01</p>
        <h1>
          Everyday layers,
          <br />
          <em>made to explore.</em>
        </h1>
        <p>
          Browse eight fictional garments. Prices, colors, and measurements are
          demonstration data.
        </p>
      </section>
      <div className="toolbar">
        <h2>
          Collection <span>({result.total})</span>
        </h2>
        <form role="search" action="/" method="get">
          <label htmlFor="catalog-search">Search garments</label>
          <div className="search-row">
            <input
              id="catalog-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Try shirt, cotton, jacket…"
              maxLength={80}
            />
            <button type="submit">Search</button>
          </div>
        </form>
      </div>
      {result.items.length ? (
        <div className="grid">
          {result.items.map((product) => (
            <Link
              className="card"
              key={product.slug}
              href={"/products/" + product.slug}
            >
              <div className="card-image">
                <img
                  src={product.imagePath}
                  alt={product.name + " illustration"}
                />
              </div>
              <div className="card-info">
                <div>
                  <span className="eyebrow">
                    {product.category} / {product.color}
                  </span>
                  <h3>{product.name}</h3>
                </div>
                <p>${(product.priceCents / 100).toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>No garments found</h3>
          <p>Try a different search term.</p>
          <Link href="/">Clear search</Link>
        </div>
      )}
    </main>
  );
}
