import Link from "next/link";
export default function ProductNotFound() {
  return (
    <main className="shell">
      <h1>Garment not found</h1>
      <p>This garment is not in the demonstration collection.</p>
      <Link href="/">Browse the collection</Link>
    </main>
  );
}
