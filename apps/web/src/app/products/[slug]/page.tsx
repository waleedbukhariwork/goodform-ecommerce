import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "../../../lib/transport";
import { getProduct } from "../../../features/catalog/api";
import { AddToCart } from "../../../features/commerce/add-to-cart";

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
    const requestId = error instanceof ApiError ? error.requestId : undefined;
    return (
      <main className="shell">
        <h1>Product unavailable</h1>
        <p>Please try again in a moment.</p>
        {requestId && <p>Support request ID: {requestId}</p>}
        <Link href={"/products/" + slug}>Retry</Link>
      </main>
    );
  }
  return (
    <main className="shell detail">
      <Link href="/" className="back">
        ← Back to collection
      </Link>
      <div className="detail-grid">
        <div className="detail-image">
          <img src={product.imagePath} alt={product.name + " illustration"} />
        </div>
        <div className="detail-copy">
          <p className="eyebrow">
            {product.category} / {product.color}
          </p>
          <h1>{product.name}</h1>
          <p className="price">${(product.priceCents / 100).toFixed(2)}</p>
          <p>{product.description}</p>
          <p className="demo-note">
            Fictional demonstration garment. Measurements below are illustrative
            and do not predict personal fit.
          </p>
          <AddToCart
            slug={product.slug}
            sizes={product.sizes.map((entry) => entry.size)}
          />
          <h2>Garment size chart</h2>
          <div className="table-scroll">
            <table>
              <caption>Measurements in centimeters</caption>
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
        </div>
      </div>
    </main>
  );
}
