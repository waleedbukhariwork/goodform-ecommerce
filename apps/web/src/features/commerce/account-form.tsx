"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/transport";
import { Failure } from "./error";

export function AccountForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
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
    }
  }
  return (
    <section className="account-panel">
      <div className="account-switch">
        <button
          type="button"
          className={mode === "signin" ? "active" : ""}
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === "signup" ? "active" : ""}
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
        >
          Create account
        </button>
      </div>
      <form onSubmit={submit}>
        {mode === "signup" && (
          <label>
            Name
            <input name="name" autoComplete="name" required minLength={2} />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
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
      {error !== null && <Failure error={error} />}
    </section>
  );
}

export function SignOut() {
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function signOut() {
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
      <button type="button" disabled={busy} onClick={signOut}>
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error !== null && <Failure error={error} />}
    </>
  );
}
