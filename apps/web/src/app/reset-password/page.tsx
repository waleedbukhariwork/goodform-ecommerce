import { ResetPassword } from "../../features/commerce/reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const query = await searchParams;
  return (
    <main id="main" className="shell page-shell">
      <span className="eyebrow">Account security</span>
      <h1 className="page-heading">Reset your password</h1>
      <ResetPassword
        token={typeof query.token === "string" ? query.token : ""}
        error={typeof query.error === "string" ? query.error : null}
      />
    </main>
  );
}
