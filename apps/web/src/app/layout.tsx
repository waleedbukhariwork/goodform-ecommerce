import type { Metadata } from "next";
import Link from "next/link";
import { DM_Sans, Newsreader } from "next/font/google";
import { Nav } from "../components/ui/nav";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});
const serif = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Goodform — The demonstration collection",
  description: "Eight demonstration garments with clear measurement guides.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="shell header-inner">
            <Link className="brand" href="/" aria-label="Goodform home">
              <span className="brand-mark" aria-hidden="true">
                g
              </span>
              GOODFORM<span>Fitting notes</span>
            </Link>
            <Nav />
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="shell footer-inner">
            <p>
              Goodform is a demonstration atelier. Garment data and measurements
              are illustrative; photography is reference only and does not
              establish personal fit.
            </p>
            <Link href="/">Return to collection</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
