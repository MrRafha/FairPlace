import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getAccountData } from "@/server/queries/account";
import { AccountManager } from "@/features/users/AccountManager";
import { AppHeader } from "@/components/layout/AppHeader";

export default function AccountPage() {
  return (
    <main id="conteudo-principal" className="fp-page">
      <Suspense fallback={<AppHeader currentAccount />}>
        <AccountContent />
      </Suspense>
    </main>
  );
}

async function AccountContent() {
  const account = await getAccountData();

  // O middleware já protege /conta, mas garantimos aqui também.
  if (!account) {
    redirect("/login");
  }

  return (
    <>
      <AppHeader isSeller={account.hasSellerProfile} currentAccount />
      <AccountManager account={account} />
    </>
  );
}
