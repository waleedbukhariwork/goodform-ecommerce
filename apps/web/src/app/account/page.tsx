import { AccountForm, SignOut } from "../../features/commerce/account-form";
export default function AccountPage() {
  return (
    <main className="shell page-shell">
      <h1>Your account</h1>
      <p>Sign in to keep your cart across visits.</p>
      <AccountForm />
      <section className="signout-panel">
        <h2>Already signed in?</h2>
        <SignOut />
      </section>
    </main>
  );
}
