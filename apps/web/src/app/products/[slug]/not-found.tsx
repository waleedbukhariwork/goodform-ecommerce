import Link from "next/link";
export default function ProductNotFound() {
  return (
    <main id="main" className="shell page-shell">
      <span className="eyebrow">Not in this edit</span>
      <h1 className="page-heading">Garment not found</h1>
      <p>This garment is not in the demonstration collection.</p>
      <Link className="button" href="/">
        Browse the collection
      </Link>
    </main>
  );
}
