export default function Loading() {
  return (
    <main
      id="main"
      className="shell page-shell"
      role="status"
      aria-label="Loading garment"
    >
      <div className="skeleton skeleton-line short" />
      <div className="detail-grid">
        <div className="media-box skeleton" />
        <div>
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line long skeleton-heading" />
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line long" />
          <div className="skeleton skeleton-line" />
          <div className="purchase-panel">
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line long skeleton-control" />
            <div className="skeleton skeleton-line long skeleton-control" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading garment details</span>
    </main>
  );
}
