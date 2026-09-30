"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormValidation } from "../../components/ui/form-validation";
import { apiFetch } from "../../lib/transport";
import { AccountForm } from "./account-form";
import { Failure } from "./error";
import { useSession, type AccountUser } from "./session";

export function AccountExperience() {
  const { user, loading, departure } = useSession();
  // A successful sign-in must keep this form on screen until the collection
  // route replaces it. Swapping to the profile first is the flicker.
  if (loading && departure === "idle") return <AccountPending />;
  if (!user || departure === "home-in") return <GuestAccount />;
  return <AccountHome user={user} />;
}

function AccountPending() {
  return (
    <>
      <span className="eyebrow">Your account</span>
      <h1 className="page-heading">Your account</h1>
      <div className="account-panel" aria-busy="true" aria-live="polite">
        <p className="muted">Checking your session…</p>
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
      </div>
    </>
  );
}

function GuestAccount() {
  return (
    <>
      <span className="eyebrow">Your private fitting notes</span>
      <h1 className="page-heading">Your account</h1>
      <div className="account-layout">
        <div className="account-intro">
          <p className="lead">
            Keep your cart close, pick up where you left off, and review an
            order after checkout.
          </p>
          <p className="muted">
            Your cart and orders belong to your account. Sign in to see your
            profile.
          </p>
        </div>
        <AccountForm />
      </div>
    </>
  );
}

function AccountHome({ user }: { user: AccountUser }) {
  const router = useRouter();
  const { replaceUser, refresh, beginRouteHome } = useSession();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [mismatch, setMismatch] = useState(false);
  const profile = useFormValidation("profile");
  const password = useFormValidation("password-change");
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  async function saveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !profile.validate(event.currentTarget)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    try {
      await apiFetch("/api/auth/update-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      replaceUser({ ...user, name });
      setEditing(false);
      setNotice("Your name is saved.");
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !password.validate(event.currentTarget)) return;
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (newPassword !== confirmation) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        }),
      });
      setChangingPassword(false);
      setNotice("Your password is updated. Other sessions were signed out.");
      await refresh();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/auth/sign-out", { method: "POST" });
      // Keep this profile mounted until the collection route commits.
      // Clearing the session here would paint the sign-in form first.
      beginRouteHome("home-out");
      router.replace("/");
    } catch (cause) {
      setError(cause);
      setBusy(false);
    }
  }

  return (
    <>
      <span className="eyebrow">Your account</span>
      <h1 className="page-heading">Hello, {firstName}</h1>
      <p className="lead">
        This is your profile. Your cart stays with this account.
      </p>
      {notice && <p role="status">{notice}</p>}
      <div className="account-grid">
        <section className="account-card" aria-labelledby="profile-heading">
          <h2 id="profile-heading">Profile</h2>
          {editing ? (
            <form onSubmit={saveName} noValidate>
              <label className="form-field">
                Name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  defaultValue={user.name}
                  {...profile.fieldProps("name")}
                />
                {profile.fieldError("name")}
              </label>
              <div className="account-actions">
                <button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save name"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditing(false);
                    profile.clear();
                    setError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <dl className="profile-facts">
                <div>
                  <dt>Name</dt>
                  <dd>{user.name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Email status</dt>
                  <dd>
                    {user.emailVerified ? "Confirmed" : "Not confirmed yet"}
                  </dd>
                </div>
              </dl>
              <p className="muted">
                Email is your sign-in address and stays as it was when you
                created the account.
              </p>
              <button type="button" onClick={() => setEditing(true)}>
                Edit profile
              </button>
            </>
          )}
        </section>
        <section className="account-card" aria-labelledby="security-heading">
          <h2 id="security-heading">Password</h2>
          <p className="muted">
            Change the password for this account. Other signed-in browsers are
            signed out.
          </p>
          {changingPassword ? (
            <form onSubmit={savePassword} noValidate>
              <label className="form-field">
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  {...password.fieldProps("currentPassword")}
                />
                {password.fieldError("currentPassword")}
              </label>
              <label className="form-field">
                New password
                <input
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  {...password.fieldProps("newPassword")}
                />
                {password.fieldError("newPassword")}
              </label>
              <label className="form-field">
                Confirm new password
                <input
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  {...password.fieldProps("confirmation")}
                />
                {password.fieldError("confirmation")}
                {mismatch && (
                  <span className="field-error" role="alert">
                    Enter the same new password in both fields.
                  </span>
                )}
              </label>
              <div className="account-actions">
                <button type="submit" disabled={busy}>
                  {busy ? "Updating…" : "Update password"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setChangingPassword(false);
                    setMismatch(false);
                    password.clear();
                    setError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setChangingPassword(true)}>
              Change password
            </button>
          )}
        </section>
        <Link className="account-tile" href="/orders">
          <strong>Your orders</strong>
          <span>Review checkouts that belong to this account.</span>
        </Link>
        <Link className="account-tile" href="/cart">
          <strong>Your cart</strong>
          <span>Open the garments saved to this account.</span>
        </Link>
        <Link className="account-tile" href="/">
          <strong>Collection</strong>
          <span>Return to the eight demonstration garments.</span>
        </Link>
        <section className="account-card" aria-labelledby="signout-heading">
          <h2 id="signout-heading">Sign out</h2>
          <p className="muted">
            Use this when you are done on a shared device.
          </p>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={signOut}
          >
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </section>
      </div>
      {error !== null && <Failure error={error} context="profile" />}
    </>
  );
}
