import { ResetPassword } from "../../features/commerce/reset-password-form";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main id="main" className="shell page-shell">
      <span className="eyebrow">Account security</span>
      <h1 className="page-heading">Reset your password</h1>
      <ResetPassword />
    </main>
  );
}
