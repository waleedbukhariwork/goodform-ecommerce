import { AccountForm, SignOut } from "../../features/commerce/account-form";
export const dynamic = "force-dynamic";
export default function AccountPage() {
  return (
    <main id="main" className="shell page-shell">
      <span className="eyebrow">Your private fitting notes</span>
      <h1 className="page-heading">Your account</h1>
      <div className="account-layout">
        <div className="account-intro">
          <p className="lead">
            Keep your cart close, pick up where you left off, and review an
            order after checkout.
          </p>
          <p className="muted">
            Your cart and orders belong to your account. The store checks your
            session before showing private information.
          </p>
          <section className="signout-panel">
            <h2>Finished for now?</h2>
            <p>Use this when you are done on a shared device.</p>
            <SignOut />
          </section>
        </div>
        <AccountForm />
      </div>
    </main>
  );
}
