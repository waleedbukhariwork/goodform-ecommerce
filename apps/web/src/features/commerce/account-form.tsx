"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/transport";
import { Failure } from "./error";

export function AccountForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => setSlow(true), 3000);
    return () => window.clearTimeout(timer);
  }, [busy]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setSlow(false);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const body =
      mode === "signup"
        ? { name: String(form.get("name") ?? ""), email, password }
        : { email, password };
    try {
      await apiFetch(
        "/api/auth/" + (mode === "signup" ? "sign-up/email" : "sign-in/email"),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      router.push("/cart");
      router.refresh();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
      setSlow(false);
    }
  }
  return (
    <section className="account-panel" aria-label="Account access">
      <div className="account-switch" role="group" aria-label="Account action">
        <button
          type="button"
          className="account-tab"
          aria-pressed={mode === "signin"}
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className="account-tab"
          aria-pressed={mode === "signup"}
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
        >
          Create account
        </button>
      </div>
      <form onSubmit={submit} aria-busy={busy}>
        {mode === "signup" && (
          <label className="form-field">
            Name
            <input name="name" autoComplete="name" required minLength={2} />
          </label>
        )}
        <label className="form-field">
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="form-field">
          Password
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            required
            minLength={8}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>
      {busy && (
        <p role="status">
          {slow
            ? "Still connecting. Your details are being checked securely."
            : "Checking your details…"}
        </p>
      )}
      {error !== null && <Failure error={error} context="auth" />}
    </section>
  );
}

export function SignOut() {
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/auth/sign-out", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (cause) {
      setError(cause);
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={signOut}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error !== null && <Failure error={error} />}
    </>
  );
}
