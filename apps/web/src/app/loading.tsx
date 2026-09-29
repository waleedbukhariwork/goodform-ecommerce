export default function Loading() {
  return (
    <main
      id="main"
      className="shell"
      role="status"
      aria-label="Loading collection"
    >
      <section className="catalog-intro">
        <div>
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line long skeleton-display" />
          <div className="skeleton skeleton-line skeleton-display" />
        </div>
        <div className="skeleton skeleton-line long skeleton-aside" />
      </section>
      <div className="catalog-toolbar">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line skeleton-search" />
      </div>
      <div className="catalog-grid loading-grid">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="loading-card" key={index}>
            <div className="media-box skeleton" />
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading garments</span>
    </main>
  );
}
