import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "../../../lib/transport";
import { getProduct } from "../../../features/catalog/api";
import { AddToCart } from "../../../features/commerce/add-to-cart";
import { ProductMedia } from "../../../components/ui/product-media";
import { Icon } from "../../../components/ui/icon";
import { formatMoney } from "../../../lib/money";
import { Failure } from "../../../features/commerce/error";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product;
  try {
    product = await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <main id="main" className="shell page-shell">
        <h1 className="page-heading">Garment unavailable</h1>
        <Failure error={error} />
        <Link className="button secondary" href={`/products/${slug}`}>
          Try again
        </Link>
      </main>
    );
  }
  const preload = product.imagePath.endsWith("-v2-1200.jpg")
    ? product.imagePath.replace("-1200.jpg", "-1200.webp")
    : undefined;
  return (
    <main id="main" className="shell page-shell">
      {preload && (
        <link rel="preload" as="image" href={preload} type="image/webp" />
      )}
      <Link href="/" className="back">
        <Icon name="arrow-left" /> Back to collection
      </Link>
      <div className="detail-grid">
        <div className="detail-image">
          <ProductMedia
            src={product.imagePath}
            alt={`Reference photograph for ${product.name}`}
            sizes="(max-width: 768px) 92vw, 48vw"
            priority
          />
          <p className="reference-note">
            Reference photography. The demonstration garment may differ in cut
            and colour.
          </p>
        </div>
        <div className="detail-copy">
          <span className="eyebrow">
            {product.category} / {product.color}
          </span>
          <h1>{product.name}</h1>
          <p className="price">{formatMoney(product.priceCents)}</p>
          <p className="lead">{product.description}</p>
          <p className="demo-note">
            Fictional demonstration garment. These are garment dimensions, not
            body measurements or a prediction of personal fit. Availability is
            checked by the server when you reserve your cart.
          </p>
          <AddToCart
            slug={product.slug}
            sizes={product.sizes.map((entry) => entry.size)}
          />
          <section aria-labelledby="size-chart-heading">
            <h2 id="size-chart-heading" className="section-title">
              Garment measurements
            </h2>
            <div className="table-scroll">
              <table>
                <caption>Centimeters, measured on the garment</caption>
                <thead>
                  <tr>
                    <th scope="col">Size</th>
                    <th scope="col">Chest</th>
                    <th scope="col">Length</th>
                    <th scope="col">Shoulder</th>
                  </tr>
                </thead>
                <tbody>
                  {product.sizes.map((size) => (
                    <tr key={size.size}>
                      <th scope="row">{size.size}</th>
                      <td>{size.chestCm}</td>
                      <td>{size.lengthCm}</td>
                      <td>{size.shoulderCm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
