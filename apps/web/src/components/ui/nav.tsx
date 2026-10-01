"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { subscribeCartQuantity } from "../../features/commerce/cart-count";
import { useSession } from "../../features/commerce/session";
import { apiFetch } from "../../lib/transport";
import { Icon } from "./icon";

function accountLabel(name: string) {
  const first = name.trim().split(/\s+/)[0];
  if (!first) return "Account";
  return first.length > 14 ? `${first.slice(0, 13)}…` : first;
}

export function Nav() {
  const pathname = usePathname();
  const { user } = useSession();
  const [cartCount, setCartCount] = useState<number | null>(null);
  const publishedAt = useRef(0);
  useEffect(
    () =>
      subscribeCartQuantity((total) => {
        publishedAt.current = Date.now();
        setCartCount(total > 0 ? total : null);
      }),
    [],
  );
  useEffect(() => {
    if (!user) {
      setCartCount(null);
      return;
    }
    let cancelled = false;
    const started = Date.now();
    apiFetch<{ items: { quantity: number }[] }>("/api/v1/cart")
      .then((cart) => {
        if (cancelled || publishedAt.current > started) return;
        const total =
          cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
        setCartCount(total > 0 ? total : null);
      })
      .catch(() => {
        if (!cancelled) setCartCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, pathname]);
  const routes = [
    { href: "/", label: "Collection", icon: "hanger" as const },
    { href: "/cart", label: "Cart", icon: "bag" as const },
    ...(user
      ? [{ href: "/orders", label: "Orders", icon: "orders" as const }]
      : []),
    {
      href: "/account",
      label: user ? accountLabel(user.name) : "Account",
      icon: "user" as const,
      labelForAssistiveTech: user ? `Account, ${user.name}` : "Account",
    },
  ];
  return (
    <nav className="site-nav" aria-label="Main navigation">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          aria-current={
            route.href === "/orders"
              ? pathname === "/orders" || pathname.startsWith("/orders/")
                ? "page"
                : undefined
              : pathname === route.href
                ? "page"
                : undefined
          }
          aria-label={
            route.href === "/cart" && cartCount
              ? `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`
              : "labelForAssistiveTech" in route
                ? route.labelForAssistiveTech
                : undefined
          }
        >
          <Icon name={route.icon} />
          <span className="nav-label">{route.label}</span>
          {route.href === "/cart" && cartCount ? (
            <span className="cart-count">{cartCount}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
