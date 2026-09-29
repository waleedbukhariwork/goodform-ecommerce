export default function Loading() {
  return (
    <main
      id="main"
      className="shell page-shell"
      role="status"
      aria-label="Loading order"
    >
      <div className="skeleton skeleton-line short" />
      <div className="skeleton skeleton-line long skeleton-heading" />
      <div className="notice pending-notice">
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line long" />
      </div>
      <div className="cart-item">
        <div className="media-box skeleton" />
        <div>
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
        <div className="skeleton skeleton-line" />
      </div>
      <span className="sr-only">Loading order status</span>
    </main>
  );
}
