"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { components } from "@goodform/api-contracts";
import { ProductMedia } from "../../components/ui/product-media";
import { Icon } from "../../components/ui/icon";
import { formatMoney } from "../../lib/money";
import { ApiError, apiFetch } from "../../lib/transport";
import { Failure } from "../commerce/error";
import { catalogPath, visibleProducts } from "./view";

type Product = components["schemas"]["ProductDto"];
type ProductList = components["schemas"]["ProductListDto"];

export function CatalogCollection({
  initialItems,
  initialTotal,
  initialQuery,
  initialCategory,
  initialSort,
}: {
  initialItems: Product[];
  initialTotal: number;
  initialQuery: string;
  initialCategory: string;
  initialSort: string;
}) {
  const [products, setProducts] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [appliedQuery, setAppliedQuery] = useState(initialQuery);
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState(initialSort);
  const [draftCategory, setDraftCategory] = useState(initialCategory);
  const [draftSort, setDraftSort] = useState(initialSort);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const request = useRef(0);
  const appliedQueryRef = useRef(initialQuery);
  const visible = visibleProducts(products, category, sort);
  const categories = [...new Set(products.map((item) => item.category))].sort();
  const categoryOptions =
    category === "all" || categories.includes(category)
      ? categories
      : [category, ...categories];
  const filtered =
    appliedQuery.length > 0 || category !== "all" || sort !== "featured";

  const load = useCallback(async (nextQuery: string) => {
    const id = ++request.current;
    setSearching(true);
    setError(null);
    try {
      const result = await apiFetch<ProductList>(
        `/api/v1/products?q=${encodeURIComponent(nextQuery)}`,
      );
      if (id !== request.current) return false;
      if (!result) {
        setError(
          new ApiError(0, "Invalid service response", crypto.randomUUID()),
        );
        return false;
      }
      setProducts(result.items);
      setTotal(result.total);
      appliedQueryRef.current = nextQuery;
      setAppliedQuery(nextQuery);
      setDraftQuery(nextQuery);
      return true;
    } catch (cause) {
      if (id !== request.current) return false;
      setError(cause);
      return false;
    } finally {
      if (id === request.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    function onPop() {
      const params = new URLSearchParams(window.location.search);
      const nextQuery = params.get("q") ?? "";
      setCategory(params.get("category") ?? "all");
      setSort(params.get("sort") ?? "featured");
      if (nextQuery !== appliedQueryRef.current) void load(nextQuery);
      else setDraftQuery(nextQuery);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [load]);

  useEffect(() => {
    setDraftCategory(category);
    setDraftSort(sort);
  }, [category, sort]);

  function remember(path: string) {
    const current = window.location.pathname + window.location.search;
    if (current !== path) window.history.pushState(null, "", path);
  }

  async function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = draftQuery.trim();
    if (!nextQuery) return;
    setDraftQuery(nextQuery);
    const ok = await load(nextQuery);
    if (ok) remember(catalogPath(nextQuery, category, sort));
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategory(draftCategory);
    setSort(draftSort);
    remember(catalogPath(appliedQuery, draftCategory, draftSort));
  }

  async function clear(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (appliedQueryRef.current) {
      const ok = await load("");
      if (!ok) return;
    }
    setCategory("all");
    setSort("featured");
    setDraftQuery("");
    remember("/");
  }

  return (
    <section aria-labelledby="garments-heading">
      <div className="catalog-toolbar">
        <h2 id="garments-heading">
          The collection{" "}
          <span>
            {visible.length} of {total} garments
          </span>
        </h2>
        <form role="search" action="/" method="get" onSubmit={submitSearch}>
          <label htmlFor="catalog-search">Find a garment</label>
          <div className="search-row">
            <input
              id="catalog-search"
              name="q"
              type="search"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              maxLength={80}
              placeholder="Search by name or material"
            />
            <button
              type="submit"
              disabled={searching || draftQuery.trim().length === 0}
            >
              <Icon name="search" /> {searching ? "Searching…" : "Search"}
            </button>
          </div>
          {filtered && (
            <a className="search-clear" href="/" onClick={clear}>
              Clear search and filters
            </a>
          )}
        </form>
      </div>
      {products.length > 0 && (
        <form
          action="/"
          method="get"
          className="catalog-filters"
          aria-label="Collection filters"
          onSubmit={applyFilters}
        >
          <input type="hidden" name="q" value={appliedQuery} />
          <label className="form-field">
            Category
            <select
              name="category"
              value={draftCategory}
              onChange={(event) => setDraftCategory(event.target.value)}
            >
              <option value="all">All garments</option>
              {categoryOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Sort by
            <select
              name="sort"
              value={draftSort}
              onChange={(event) => setDraftSort(event.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
          <button type="submit" className="secondary">
            Apply
          </button>
        </form>
      )}
      {error !== null && <Failure error={error} />}
      {visible.length ? (
        <div className="catalog-grid" aria-busy={searching}>
          {visible.map((product, index) => (
            <Link
              className="product-card"
              key={product.slug}
              href={`/products/${product.slug}`}
            >
              <ProductMedia
                src={product.imagePath}
                alt={`Reference photograph for ${product.name}`}
                sizes="(max-width: 360px) 288px, (max-width: 768px) 45vw, (max-width: 1024px) 30vw, 22vw"
                priority={index === 0}
              />
              <div className="product-card-copy">
                <span className="piece-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="eyebrow">
                  {product.category} / {product.color}
                </span>
                <h3>{product.name}</h3>
                <p className="price">{formatMoney(product.priceCents)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <span className="eyebrow">No match in this edit</span>
          <h3>Nothing fits that search.</h3>
          <p>Try another name or view all eight garments.</p>
          <a className="button" href="/" onClick={clear}>
            Clear search and filters <Icon name="arrow-right" />
          </a>
        </div>
      )}
    </section>
  );
}
