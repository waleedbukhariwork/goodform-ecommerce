export default function Loading() {
  return (
    <main
      id="main"
      className="shell page-shell"
      role="status"
      aria-label="Loading cart"
    >
      <div className="skeleton skeleton-line short" />
      <div className="skeleton skeleton-line long skeleton-heading" />
      <div className="cart-layout">
        <div className="cart-items">
          {Array.from({ length: 2 }, (_, index) => (
            <div className="cart-item" key={index}>
              <div className="media-box skeleton" />
              <div>
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
                <div className="skeleton skeleton-line short" />
              </div>
              <div className="skeleton skeleton-line" />
            </div>
          ))}
        </div>
        <div className="checkout-summary">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line long skeleton-control" />
        </div>
      </div>
      <span className="sr-only">Loading your cart</span>
    </main>
  );
}
