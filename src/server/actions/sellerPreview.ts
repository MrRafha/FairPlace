"use server";

import { getSellerProfile, type PublicSellerProfile } from "@/server/queries/sellerProfile";
import { isFavorited } from "@/server/actions/favorites";

export type SellerPreview = Omit<PublicSellerProfile, "posts"> & {
  posts: { id: string; text: string; createdAt: string }[];
  totalListings: number;
  favorited: boolean;
};

const MAX_LISTINGS = 6;
const MAX_POSTS = 3;

// Dados do painel lateral do /mapa (resumo do perfil público, carregado sob demanda).
export async function getSellerPreview(id: string): Promise<SellerPreview | null> {
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return null;

  const seller = await getSellerProfile(id);
  if (!seller) return null;

  const favorited = await isFavorited(seller.id);

  return {
    ...seller,
    listings: seller.listings.slice(0, MAX_LISTINGS),
    totalListings: seller.listings.length,
    posts: seller.posts.slice(0, MAX_POSTS).map((post) => ({
      id: post.id,
      text: post.text,
      createdAt: post.createdAt.toISOString(),
    })),
    favorited,
  };
}
