import { prisma } from "@/lib/prisma";
import type { ListingCategoryValue } from "@/lib/constants";

export type MapSeller = {
  id: string;
  displayName: string;
  description: string | null;
  category: ListingCategoryValue;
  address: string | null;
  latitude: number;
  longitude: number;
  isVerified: boolean;
};

// Busca vendedores com coordenadas válidas para exibir no mapa.
// Vendedores sem latitude/longitude são omitidos — não há como posicioná-los.
export async function getMapSellers(): Promise<MapSeller[]> {
  const sellers = await prisma.sellerProfile.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      displayName: true,
      description: true,
      category: true,
      address: true,
      latitude: true,
      longitude: true,
      isVerified: true,
    },
  });

  return sellers
    .filter((seller) => seller.latitude !== null && seller.longitude !== null)
    .map((seller) => ({
      id: seller.id,
      displayName: seller.displayName,
      description: seller.description,
      category: seller.category as ListingCategoryValue,
      address: seller.address,
      latitude: Number(seller.latitude),
      longitude: Number(seller.longitude),
      isVerified: seller.isVerified,
    }));
}
