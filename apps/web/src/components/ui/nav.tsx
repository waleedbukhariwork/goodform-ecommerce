"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "../../features/commerce/session";
import { Icon } from "./icon";

function accountLabel(name: string) {
  const first = name.trim().split(/\s+/)[0];
  if (!first) return "Account";
  return first.length > 14 ? `${first.slice(0, 13)}…` : first;
}

export function Nav() {
  const pathname = usePathname();
  const { user } = useSession();
  const routes = [
    { href: "/", label: "Collection", icon: "search" as const },
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
            "labelForAssistiveTech" in route
              ? route.labelForAssistiveTech
              : undefined
          }
        >
          <Icon name={route.icon} />
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
