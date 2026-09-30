import { EmailVerified } from "../../features/commerce/email-verified";

export const dynamic = "force-dynamic";

export default async function EmailVerifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main id="main" className="shell page-shell">
      <EmailVerified error={typeof error === "string" ? error : null} />
    </main>
  );
}
