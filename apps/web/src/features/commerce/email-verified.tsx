"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "../../components/ui/icon";
import { useSession } from "./session";

const CONTINUE_MS = 4000;

function verificationError(code: string | null) {
  if (code === "TOKEN_EXPIRED")
    return "That link has expired. Request a new one from your account. Links last about an hour.";
  if (code === "INVALID_TOKEN")
    return "That link is not valid. Request a new one from your account.";
  if (code)
    return "We could not confirm that link. Request a new one from your account.";
  return null;
}

export function EmailVerified({ error }: { error: string | null }) {
  const router = useRouter();
  const { user, loading } = useSession();
  const [leaving, setLeaving] = useState(false);
  const problem = verificationError(error);
  const confirmed = !problem && !loading && user?.emailVerified === true;

  useEffect(() => {
    if (!confirmed) return;
    const timer = window.setTimeout(() => {
      setLeaving(true);
      router.replace("/");
    }, CONTINUE_MS);
    return () => window.clearTimeout(timer);
  }, [confirmed, router]);

  if (problem) {
    return (
      <>
        <span className="eyebrow">Account</span>
        <h1 className="page-heading">We could not confirm that link</h1>
        <section
          className="account-panel confirm-panel"
          aria-label="Verification problem"
        >
          <p role="alert">{problem}</p>
          <Link className="button" href="/account">
            Back to your account
          </Link>
        </section>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <span className="eyebrow">Account</span>
        <h1 className="page-heading">Confirming your email</h1>
        <section
          className="account-panel confirm-panel"
          aria-busy="true"
          aria-live="polite"
        >
          <p>Checking the confirmation from your email link.</p>
        </section>
      </>
    );
  }

  if (!confirmed || !user) {
    return (
      <>
        <span className="eyebrow">Account</span>
        <h1 className="page-heading">Sign in to continue</h1>
        <section
          className="account-panel confirm-panel"
          aria-label="Sign in after verification"
        >
          <p>
            This email is already confirmed, or this visit did not keep a
            session. Sign in and your name will appear in the header.
          </p>
          <Link className="button" href="/account">
            Sign in
          </Link>
        </section>
      </>
    );
  }

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  return (
    <>
      <span className="eyebrow">Account</span>
      <h1 className="page-heading">Your email is confirmed</h1>
      <section
        className="account-panel confirm-panel"
        aria-label="Email confirmed"
      >
        <p className="confirm-mark">
          <Icon name="check" />
        </p>
        <p role="status">
          Hello, {firstName}. {user.email} is verified. Your name is in the
          header, and your cart stays with this account.
        </p>
        <Link
          className="button"
          href="/"
          replace
          onClick={() => setLeaving(true)}
        >
          Continue to the collection
        </Link>
        <p className="muted" aria-live="polite">
          {leaving
            ? "Opening the collection…"
            : "Opening the collection in a moment."}
        </p>
      </section>
    </>
  );
}
