"use client";
import { useState } from "react";
import { apiFetch } from "../../lib/transport";
import { Failure } from "../../features/commerce/error";

export function ResetPassword() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError(new Error("Those passwords do not match."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          newPassword: password,
          // Read by Better Auth from the link; never accepted from the client.
          token: new URLSearchParams(window.location.search).get("token") ?? "",
        }),
      });
      setDone(true);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="account-panel">
        <h2>Password updated</h2>
        <p role="status">You can now sign in with your new password.</p>
        <a className="action" href="/account">
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="account-panel">
      <h2>Choose a new password</h2>
      <form onSubmit={submit} aria-busy={busy}>
        <label className="form-field">
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <label className="form-field">
          Confirm new password
          <input
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
      {error !== null && <Failure error={error} context="auth" />}
    </div>
  );
}
