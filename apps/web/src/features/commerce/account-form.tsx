"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "../../lib/transport";
import { Failure } from "./error";
import { useFormValidation } from "../../components/ui/form-validation";
import { useSession } from "./session";

/** Mirrors the server window so the first paint does not flash an enabled button. */
const MAIL_COOLDOWN_SECONDS = 60;
/** Better Auth redirects the verification link here after it marks the email confirmed. */
const VERIFIED_PATH = "/email-verified";
/** Mail delivery is bounded at 8s on the server; keep the browser request open past that. */
const MAIL_REQUEST_TIMEOUT_MS = 12_000;

type Step = "email" | "password" | "create" | "verify" | "reset";
type AccountState = "new" | "verified" | "unverified";

async function postVerification(email: string) {
  await apiFetch("/api/auth/send-verification-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    timeoutMs: MAIL_REQUEST_TIMEOUT_MS,
    body: JSON.stringify({ email, callbackURL: VERIFIED_PATH }),
  });
}

function verificationLimited(cause: unknown) {
  return cause instanceof ApiError && cause.status === 429;
}

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
  const { refresh, beginRouteHome, cancelRouteHome } = useSession();
  const [step, setStep] = useState<Step>("email");
  const [guide, setGuide] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [resetNotice, setResetNotice] = useState(false);
  const validation = useFormValidation("account");
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => setSlow(true), 3000);
    return () => window.clearTimeout(timer);
  }, [busy]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((value) => (value > 0 ? value - 1 : 0)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown > 0]);

  function changeEmail() {
    setStep("email");
    setGuide(null);
    setError(null);
    setMismatch(false);
    setLinkSent(false);
    setResetNotice(false);
    validation.clear();
  }

  async function openVerify(sent: boolean) {
    setLinkSent(sent);
    setStep("verify");
    setCooldown(await fetchCooldown(email));
  }

  async function continueWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validation.validate(event.currentTarget)) return;
    setBusy(true);
    setSlow(false);
    setError(null);
    setGuide(null);
    const nextEmail = String(
      new FormData(event.currentTarget).get("email") ?? "",
    )
      .trim()
      .toLowerCase();
    setEmail(nextEmail);
    try {
      const result = await apiFetch<{ status: AccountState }>(
        `/api/v1/auth/account-state?email=${encodeURIComponent(nextEmail)}`,
        { cache: "no-store" },
      );
      if (result?.status === "verified") {
        setStep("password");
      } else if (result?.status === "unverified") {
        const waiting = await fetchCooldown(nextEmail);
        if (waiting > 0) {
          setLinkSent(true);
          setCooldown(waiting);
        } else {
          try {
            await postVerification(nextEmail);
            setLinkSent(true);
            setCooldown(MAIL_COOLDOWN_SECONDS);
          } catch (cause) {
            const retry = await fetchCooldown(nextEmail);
            if (retry > 0 || verificationLimited(cause)) {
              setLinkSent(true);
              setCooldown(retry > 0 ? retry : MAIL_COOLDOWN_SECONDS);
            } else {
              setLinkSent(false);
              setError(cause);
              setCooldown(retry);
            }
          }
        }
        setStep("verify");
      } else {
        setStep("create");
        setGuide("No account yet for this email. Create one to continue.");
      }
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
      setSlow(false);
    }
  }

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validation.validate(event.currentTarget)) return;
    setBusy(true);
    setError(null);
    setResetNotice(false);
    const address = String(
      new FormData(event.currentTarget).get("email") ?? "",
    );
    try {
      // The response is identical whether or not the address exists, so it
      // cannot be used to discover which emails are registered.
      await apiFetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        timeoutMs: MAIL_REQUEST_TIMEOUT_MS,
        body: JSON.stringify({ email: address, redirectTo: "/reset-password" }),
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
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (step === "create") {
      const confirmation = String(form.get("confirmation") ?? "");
      if (password !== confirmation) {
        setMismatch(true);
        return;
      }
    }
    setMismatch(false);
    setBusy(true);
    setSlow(false);
    setError(null);
    let openingHome = false;
    const body =
      step === "create"
        ? {
            name: String(form.get("name") ?? ""),
            email,
            password,
            callbackURL: VERIFIED_PATH,
          }
        : { email, password, callbackURL: VERIFIED_PATH };
    try {
      const response = await apiFetch<{ token: string | null }>(
        "/api/auth/" + (step === "create" ? "sign-up/email" : "sign-in/email"),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          timeoutMs: MAIL_REQUEST_TIMEOUT_MS,
          body: JSON.stringify(body),
        },
      );
      if (step === "create" && response?.token === null) {
        await openVerify(true);
        return;
      }
      beginRouteHome("home-in");
      openingHome = true;
      const signedIn = await refresh();
      if (!signedIn) {
        cancelRouteHome();
        openingHome = false;
        setError(new ApiError(0, "Session unavailable", crypto.randomUUID()));
        return;
      }
      router.replace("/");
    } catch (cause) {
      if (
        step === "password" &&
        cause instanceof ApiError &&
        cause.code === "EMAIL_NOT_VERIFIED"
      ) {
        await openVerify(true);
        return;
      }
      if (
        step === "create" &&
        cause instanceof ApiError &&
        (cause.status === 422 || cause.code === "USER_ALREADY_EXISTS")
      ) {
        setStep("password");
        setError(cause);
        return;
      }
      if (openingHome) cancelRouteHome();
      openingHome = false;
      setError(cause);
    } finally {
      if (!openingHome) {
        setBusy(false);
        setSlow(false);
      }
    }
  }

  if (step === "verify") {
    return (
      <section className="account-panel" aria-label="Verify your email">
        <h2>Check your email</h2>
        <KnownEmail email={email} onChange={changeEmail} />
        <p role="status">
          {linkSent
            ? `We sent a verification link to ${email}. Open it to confirm your email.`
            : "This email is not confirmed yet. Request a verification link, then open it."}
        </p>
        {linkSent && (
          <p className="muted">
            Nothing arrived? Check your spam folder, or resend the link.
          </p>
        )}
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
                await postVerification(email);
                setLinkSent(true);
                setCooldown(MAIL_COOLDOWN_SECONDS);
                setResendCount((count) => count + 1);
              } catch (cause) {
                const wait = await fetchCooldown(email);
                if (wait > 0 || verificationLimited(cause)) {
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
              : linkSent
                ? cooldown > 0
                  ? `Resend link in ${cooldown}s`
                  : "Resend link"
                : cooldown > 0
                  ? `Send link in ${cooldown}s`
                  : "Send link"}
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

  if (step === "reset") {
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
                defaultValue={email}
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
            setStep("password");
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
      <h2>
        {step === "email"
          ? "Sign in or create an account"
          : step === "create"
            ? "Create account"
            : "Sign in"}
      </h2>
      {step === "email" && (
        <p className="muted">
          Enter your email. Sign in and a new account both start here.
        </p>
      )}
      {guide && <p role="status">{guide}</p>}
      {step === "email" ? (
        <form onSubmit={continueWithEmail} aria-busy={busy} noValidate>
          <label className="form-field">
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              {...validation.fieldProps("email")}
            />
            {validation.fieldError("email")}
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Please wait…" : "Continue"}
          </button>
        </form>
      ) : (
        <form onSubmit={submit} aria-busy={busy} noValidate>
          <KnownEmail email={email} onChange={changeEmail} />
          {step === "create" && (
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
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                step === "create" ? "new-password" : "current-password"
              }
              required
              minLength={8}
              {...validation.fieldProps("password")}
            />
            {validation.fieldError("password")}
          </label>
          {step === "create" && (
            <label className="form-field">
              Re-enter password
              <input
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                {...validation.fieldProps("confirmation")}
                onInput={(event) => {
                  setMismatch(false);
                  validation.fieldProps("confirmation").onInput(event);
                }}
              />
              {validation.fieldError("confirmation")}
              {mismatch && (
                <span className="field-error" role="alert">
                  Those passwords do not match.
                </span>
              )}
            </label>
          )}
          <button type="submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : step === "create"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      )}
      {step === "password" && (
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setStep("reset");
            setError(null);
            validation.clear();
          }}
        >
          Forgot your password?
        </button>
      )}
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
          context={
            error instanceof ApiError &&
            (error.status === 422 || error.code === "USER_ALREADY_EXISTS")
              ? "signup"
              : "auth"
          }
        />
      )}
    </section>
  );
}

function KnownEmail({
  email,
  onChange,
}: {
  email: string;
  onChange: () => void;
}) {
  return (
    <div className="account-known-email">
      <p>{email}</p>
      <button type="button" className="link-button" onClick={onChange}>
        Change
      </button>
    </div>
  );
}
