import { prisma } from "@/lib/prisma";
import type { ListingCategoryValue } from "@/lib/constants";
import { toWeekdays } from "@/lib/weekdays";

export type PublicSellerLocation = {
  id: string;
  label: string;
  address: string | null;
  latitude: number;
  longitude: number;
  weekdays: number[];
};

export type SellerListing = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: ListingCategoryValue;
  available: boolean;
};

export type SellerPost = {
  id: string;
  text: string;
  imageUrl: string | null;
  createdAt: Date;
};

export type PublicSellerProfile = {
  id: string;
  displayName: string;
  description: string | null;
  category: ListingCategoryValue;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  openingHours: string | null;
  isVerified: boolean;
  listings: SellerListing[];
  posts: SellerPost[];
  locations: PublicSellerLocation[];
};

// Carrega o perfil público de um vendedor com seus produtos disponíveis e
// publicações recentes. Retorna null quando o id não existe.
export async function getSellerProfile(id: string): Promise<PublicSellerProfile | null> {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id },
    include: {
      listings: {
        where: { available: true },
        orderBy: { createdAt: "desc" },
      },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      locations: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!seller) {
    return null;
  }

  return {
    id: seller.id,
    displayName: seller.displayName,
    description: seller.description,
    category: seller.category as ListingCategoryValue,
    phone: seller.phone,
    address: seller.address,
    latitude: seller.latitude === null ? null : Number(seller.latitude),
    longitude: seller.longitude === null ? null : Number(seller.longitude),
    openingHours: seller.openingHours,
    isVerified: seller.isVerified,
    listings: seller.listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: Number(listing.price),
      imageUrl: listing.imageUrl,
      category: listing.category as ListingCategoryValue,
      available: listing.available,
    })),
    posts: seller.posts.map((post) => ({
      id: post.id,
      text: post.text,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
    })),
    locations: seller.locations.map((location) => ({
      id: location.id,
      label: location.label,
      address: location.address,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      weekdays: toWeekdays(location.weekdays),
    })),
  };
}
