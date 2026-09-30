"use client";
import { useState } from "react";
import { apiFetch } from "../../lib/transport";
import { Failure } from "../../features/commerce/error";
import { useFormValidation } from "../../components/ui/form-validation";

export function ResetPassword() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const validation = useFormValidation("reset");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validation.validate(event.currentTarget)) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      validation.setFieldError("confirmation", "Those passwords do not match.");
      (
        event.currentTarget.elements.namedItem(
          "confirmation",
        ) as HTMLInputElement
      ).focus();
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
        <a className="button" href="/account">
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="account-panel">
      <h2>Choose a new password</h2>
      <form onSubmit={submit} aria-busy={busy} noValidate>
        <label className="form-field">
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            {...validation.fieldProps("password")}
          />
          {validation.fieldError("password")}
        </label>
        <label className="form-field">
          Confirm new password
          <input
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            {...validation.fieldProps("confirmation")}
          />
          {validation.fieldError("confirmation")}
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
      {error !== null && <Failure error={error} context="password" />}
    </div>
  );
}
