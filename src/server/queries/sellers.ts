import { prisma } from "@/lib/prisma";
import type { ListingCategoryValue } from "@/lib/constants";
import { toWeekdays, todayWeekday } from "@/lib/weekdays";

// Cada item é um PONTO DE VENDA no mapa (não um vendedor): um vendedor com
// vários locais de atendimento hoje aparece uma vez por local.
export type MapSeller = {
  id: string;
  locationId: string;
  locationLabel: string | null;
  displayName: string;
  description: string | null;
  category: ListingCategoryValue;
  address: string | null;
  latitude: number;
  longitude: number;
  isVerified: boolean;
};


// Regras:
// - vendedor COM locais cadastrados: um ponto por local que atende hoje
//   (sem local hoje, ele não aparece no mapa);
// - vendedor SEM locais cadastrados: um ponto no endereço do perfil, se tiver coordenadas.
// O filtro por dia é feito em JS (não com `has`) para funcionar também no SQLite.
export async function getMapSellers(): Promise<MapSeller[]> {
  const sellers = await prisma.sellerProfile.findMany({
    where: {
      OR: [{ latitude: { not: null }, longitude: { not: null } }, { locations: { some: {} } }],
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
      locations: {
        select: { id: true, label: true, address: true, latitude: true, longitude: true, weekdays: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const today = todayWeekday();
  const points: MapSeller[] = [];

  for (const seller of sellers) {
    const base = {
      id: seller.id,
      displayName: seller.displayName,
      description: seller.description,
      category: seller.category as ListingCategoryValue,
      isVerified: seller.isVerified,
    };

    if (seller.locations.length > 0) {
      for (const location of seller.locations) {
        if (!toWeekdays(location.weekdays).includes(today)) continue;
        points.push({
          ...base,
          locationId: location.id,
          locationLabel: location.label,
          address: location.address ?? seller.address,
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
        });
      }
      continue;
    }

    if (seller.latitude !== null && seller.longitude !== null) {
      points.push({
        ...base,
        locationId: `${seller.id}:main`,
        locationLabel: null,
        address: seller.address,
        latitude: Number(seller.latitude),
        longitude: Number(seller.longitude),
      });
    }
  }

  return points;
}
