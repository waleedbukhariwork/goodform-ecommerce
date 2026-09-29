"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell">
      <h1>Something went wrong</h1>
      <p>We could not load this page.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
