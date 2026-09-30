"use client";
import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/transport";
import { Failure } from "../../features/commerce/error";
import { useFormValidation } from "../../components/ui/form-validation";

export function ResetPassword({
  token,
  error,
}: {
  token: string;
  error: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const validation = useFormValidation("reset");
  const linkInvalid = error === "INVALID_TOKEN" || token.length === 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || linkInvalid || !validation.validate(event.currentTarget))
      return;
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
    setFailure(null);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          newPassword: password,
          token,
        }),
      });
      setDone(true);
    } catch (cause) {
      setFailure(cause);
    } finally {
      setBusy(false);
    }
  }

  if (linkInvalid) {
    return (
      <section
        className="account-panel confirm-panel"
        aria-label="Reset link problem"
      >
        <h2>This reset link cannot be used</h2>
        <p role="alert">
          The link is missing, invalid, or expired. Request a new one. Reset
          links last about an hour and work once.
        </p>
        <Link className="button" href="/account">
          Request a new link
        </Link>
      </section>
    );
  }

  if (done) {
    return (
      <section
        className="account-panel confirm-panel"
        aria-label="Password updated"
      >
        <h2>Password updated</h2>
        <p role="status">
          Your password is saved and other sessions for this account were signed
          out. Sign in with the new password. Your name will appear in the
          header.
        </p>
        <Link className="button" href="/account">
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section
      className="account-panel confirm-panel"
      aria-label="Choose a new password"
    >
      <h2>Choose a new password</h2>
      <p className="muted">
        Use at least 8 characters. This replaces the password on the account
        that requested the link.
      </p>
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
      {failure !== null && <Failure error={failure} context="password" />}
    </section>
  );
}
