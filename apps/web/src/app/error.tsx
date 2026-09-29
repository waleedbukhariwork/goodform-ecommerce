"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="shell page-shell">
      <span className="eyebrow">A pause in the fitting room</span>
      <h1 className="page-heading">This page did not load.</h1>
      <p>
        There was a problem showing this page. Try again, or return to the
        collection.
      </p>
      <p className="reference-note">Support request ID: unavailable</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
