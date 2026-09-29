import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goodform — Demo collection",
  description: "Eight demonstration garments with measurement guides.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a className="brand" href="/">
            GOODFORM<span> / DEMO</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="/">Collection</a>
            <a href="/cart">Cart</a>
            <a href="/account">Account</a>
          </nav>
        </header>
        {children}
        <footer>
          Goodform demonstration catalog · Garment measurements are
          illustrative, not fit advice.
        </footer>
      </body>
    </html>
  );
}
