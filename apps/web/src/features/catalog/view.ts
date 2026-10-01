type Garment = {
  category: string;
  priceCents: number;
  name: string;
};

export function visibleProducts<T extends Garment>(
  items: readonly T[],
  category: string,
  sort: string,
) {
  const visible = items.filter(
    (item) => category === "all" || item.category === category,
  );
  if (sort === "price-low") {
    visible.sort(
      (a, b) => a.priceCents - b.priceCents || a.name.localeCompare(b.name),
    );
  } else if (sort === "price-high") {
    visible.sort(
      (a, b) => b.priceCents - a.priceCents || a.name.localeCompare(b.name),
    );
  }
  return visible;
}

export function catalogPath(q: string, category: string, sort: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category !== "all") params.set("category", category);
  if (sort !== "featured") params.set("sort", sort);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
