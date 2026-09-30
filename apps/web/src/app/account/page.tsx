import { AccountExperience } from "../../features/commerce/account-home";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <main id="main" className="shell page-shell">
      <AccountExperience />
    </main>
  );
}
