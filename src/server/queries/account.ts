
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ListingCategoryValue } from "@/lib/constants";

export type AccountData = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  hasSellerProfile: boolean;
  sellerProfileId: string | null;
  favorites: {
    id: string;
    sellerId: string;
    displayName: string;
    category: ListingCategoryValue;
  }[];
};

export async function getAccountData(): Promise<AccountData | null> {
  const session = await getSession();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      sellerProfile: { select: { id: true } },
      favorites: {
        include: { seller: { select: { id: true, displayName: true, category: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    hasSellerProfile: Boolean(user.sellerProfile),
    sellerProfileId: user.sellerProfile?.id ?? null,
    favorites: user.favorites.map((favorite) => ({
      id: favorite.id,
      sellerId: favorite.seller.id,
      displayName: favorite.seller.displayName,
      category: favorite.seller.category as ListingCategoryValue,
    })),
  };
}
