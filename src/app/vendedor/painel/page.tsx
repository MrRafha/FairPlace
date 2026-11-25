import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentSellerProfile } from "@/server/actions/sellerContext";
import { prisma } from "@/lib/prisma";
import { SellerDashboard } from "@/features/listings/SellerDashboard";
import { AppHeader } from "@/components/layout/AppHeader";
import { toWeekdays } from "@/lib/weekdays";

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SellerDashboardPage() {
  return (
    <main id="conteudo-principal" className="fp-page">
      <Suspense fallback={<AppHeader />}>
        <SellerDashboardContent />
      </Suspense>
    </main>
  );
}

async function SellerDashboardContent() {
  const seller = await getCurrentSellerProfile();

  // Usuários sem perfil de vendedor não acessam o painel (controle de acesso).
  if (!seller) {
    redirect("/conta");
  }

  const [listings, posts, locations] = await Promise.all([
    prisma.listing.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "desc" } }),
    prisma.sellerPost.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "desc" } }),
    prisma.sellerLocation.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <>
      <AppHeader isSeller />
      <div className="fp-dash">
        <SellerDashboard
          seller={{
            id: seller.id,
            displayName: seller.displayName,
            category: seller.category,
            isVerified: seller.isVerified,
          }}
          listings={listings.map((listing) => ({
            id: listing.id,
            title: listing.title,
            description: listing.description,
            price: Number(listing.price),
            category: listing.category,
            available: listing.available,
          }))}
          posts={posts.map((post) => ({
            id: post.id,
            text: post.text,
            createdAt: formatDate(post.createdAt),
          }))}
          locations={locations.map((location) => ({
            id: location.id,
            label: location.label,
            address: location.address,
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            weekdays: toWeekdays(location.weekdays),
          }))}
          profile={{
            displayName: seller.displayName,
            description: seller.description,
            category: seller.category,
            phone: seller.phone,
            address: seller.address,
            openingHours: seller.openingHours,
            latitude: seller.latitude === null ? null : Number(seller.latitude),
            longitude: seller.longitude === null ? null : Number(seller.longitude),
          }}
        />
      </div>
    </>
  );
}
