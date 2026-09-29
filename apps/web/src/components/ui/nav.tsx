"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

export function Nav() {
  const pathname = usePathname();
  const routes = [
    { href: "/", label: "Collection", icon: "search" as const },
    { href: "/cart", label: "Cart", icon: "bag" as const },
    { href: "/account", label: "Account", icon: "user" as const },
  ];
  return (
    <nav className="site-nav" aria-label="Main navigation">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          aria-current={pathname === route.href ? "page" : undefined}
        >
          <Icon name={route.icon} />
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
