"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "../../components/ui/icon";

export function CatalogSearch({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const hasQuery = query.trim().length > 0;

  return (
    <form
      role="search"
      action="/"
      method="get"
      onSubmit={(event) => {
        if (!hasQuery) {
          event.preventDefault();
          return;
        }
        const input = event.currentTarget.elements.namedItem(
          "q",
        ) as HTMLInputElement;
        input.value = query.trim();
      }}
    >
      <label htmlFor="catalog-search">Find a garment</label>
      <div className="search-row">
        <input
          id="catalog-search"
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          maxLength={80}
          placeholder="Search by name or material"
        />
        <button type="submit" disabled={!hasQuery}>
          <Icon name="search" /> Search
        </button>
      </div>
      {initialQuery && (
        <Link className="search-clear" href="/">
          Clear search and filters
        </Link>
      )}
    </form>
  );
}
