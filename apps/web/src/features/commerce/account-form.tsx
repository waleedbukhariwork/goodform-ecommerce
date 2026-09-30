"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "../../lib/transport";
import { Failure } from "./error";
import { useFormValidation } from "../../components/ui/form-validation";

/** Mirrors the server window so the first paint does not flash an enabled button. */
const MAIL_COOLDOWN_SECONDS = 60;

async function fetchCooldown(email: string): Promise<number> {
  try {
    const result = await apiFetch<{ retryAfterSeconds: number }>(
      `/api/v1/auth/mail-cooldown?kind=verification&email=${encodeURIComponent(email)}`,
      { cache: "no-store" },
    );
    return result?.retryAfterSeconds ?? 0;
  } catch {
    // Falling back to the local window is safe: the server still refuses an
    // early send, so a failed lookup can only make the button stricter.
    return 0;
  }
}

export function AccountForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [forgot, setForgot] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);
  const validation = useFormValidation("account");
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => setSlow(true), 3000);
    return () => window.clearTimeout(timer);
  }, [busy]);
  // One ticking interval, torn down on unmount and whenever the wait ends.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((value) => (value > 0 ? value - 1 : 0)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown > 0]);

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validation.validate(event.currentTarget)) return;
    setBusy(true);
    setError(null);
    setResetNotice(false);
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    try {
      // The response is identical whether or not the address exists, so it
      // cannot be used to discover which emails are registered.
      await apiFetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, redirectTo: "/reset-password" }),
      });
      setResetNotice(true);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validation.validate(event.currentTarget)) return;
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
      const response = await apiFetch<{ token: string | null }>(
        "/api/auth/" + (mode === "signup" ? "sign-up/email" : "sign-in/email"),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      // The session cookie is HttpOnly. Better Auth returns a null token when
      // signup needs email verification, and a token when it signs in.
      if (mode === "signup" && response?.token === null) {
        setPendingEmail(email);
        setCooldown(await fetchCooldown(email));
        return;
      }
      router.push("/cart");
      router.refresh();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
      setSlow(false);
    }
  }

  if (pendingEmail) {
    return (
      <section className="account-panel" aria-label="Verify your email">
        <h2>Check your email</h2>
        <p role="status">
          We sent a verification link to {pendingEmail}. Open it to finish
          creating your account.
        </p>
        <p className="muted">
          Nothing arrived? Check your spam folder, or request another link.
        </p>
        <div className="account-actions" role="group" aria-label="Next action">
          <button
            type="button"
            disabled={busy || cooldown > 0}
            aria-describedby={cooldown > 0 ? "resend-cooldown" : undefined}
            onClick={async () => {
              if (busy || cooldown > 0) return;
              setBusy(true);
              setError(null);
              try {
                await apiFetch("/api/auth/send-verification-email", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    email: pendingEmail,
                    callbackURL: "/account",
                  }),
                });
                // The server owns the cooldown; re-read it rather than
                // guessing, so a rate-limited send cannot be retried early.
                setCooldown(MAIL_COOLDOWN_SECONDS);
                setResendCount((count) => count + 1);
              } catch (cause) {
                const wait = await fetchCooldown(pendingEmail);
                if (
                  wait > 0 ||
                  (cause instanceof ApiError && cause.status === 429)
                ) {
                  setCooldown(wait > 0 ? wait : MAIL_COOLDOWN_SECONDS);
                  setError(null);
                } else {
                  setError(cause);
                  setCooldown(wait);
                }
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy
              ? "Sending…"
              : cooldown > 0
                ? `Resend link in ${cooldown}s`
                : "Resend link"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setPendingEmail(null);
              setError(null);
              setCooldown(0);
            }}
          >
            Use a different email
          </button>
        </div>
        {cooldown > 0 && (
          <p id="resend-cooldown" className="muted" aria-live="polite">
            {resendCount > 0
              ? `Sent ${resendCount} time${resendCount > 1 ? "s" : ""}. You can request another link when the timer reaches zero.`
              : "For your security you can request one link per minute."}
          </p>
        )}
        {error !== null && <Failure error={error} context="verification" />}
      </section>
    );
  }

  if (forgot) {
    return (
      <section className="account-panel" aria-label="Reset your password">
        <h2>Reset your password</h2>
        {resetNotice ? (
          <p role="status">
            If that address has an account, a reset link is on its way. The link
            expires shortly.
          </p>
        ) : (
          <form onSubmit={requestReset} aria-busy={busy} noValidate>
            <label className="form-field">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                {...validation.fieldProps("email")}
              />
              {validation.fieldError("email")}
            </label>
            <button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setForgot(false);
            setResetNotice(false);
            setError(null);
            validation.clear();
          }}
        >
          Back to sign in
        </button>
        {error !== null && <Failure error={error} context="reset" />}
      </section>
    );
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
            validation.clear();
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
            validation.clear();
          }}
        >
          Create account
        </button>
      </div>
      <form onSubmit={submit} aria-busy={busy} noValidate>
        {mode === "signup" && (
          <label className="form-field">
            Name
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              {...validation.fieldProps("name")}
            />
            {validation.fieldError("name")}
          </label>
        )}
        <label className="form-field">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            {...validation.fieldProps("email")}
          />
          {validation.fieldError("email")}
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
            {...validation.fieldProps("password")}
          />
          {validation.fieldError("password")}
        </label>
        <button type="submit" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>
      <button
        type="button"
        className="link-button"
        onClick={() => {
          setForgot(true);
          setError(null);
          validation.clear();
        }}
      >
        Forgot your password?
      </button>
      {busy && (
        <p role="status">
          {slow
            ? "Still connecting. Your details are being checked securely."
            : "Checking your details…"}
        </p>
      )}
      {error !== null && (
        <Failure
          error={error}
          context={mode === "signup" ? "signup" : "auth"}
        />
      )}
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
