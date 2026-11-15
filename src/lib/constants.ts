export const LISTING_CATEGORIES = [
  { value: "MARKET", label: "Feira e alimentos", icon: "market" as const, countLabel: "68 lojas" },
  { value: "CRAFT", label: "Artesanato", icon: "craft" as const, countLabel: "42 lojas" },
  { value: "FARM", label: "Agricultura local", icon: "farm" as const, countLabel: "31 lojas" },
] as const;

export type ListingCategoryValue = (typeof LISTING_CATEGORIES)[number]["value"];

// Centro inicial do mapa (Corrente, Piauí). Configurável — ponto de partida
// antes de o mapa centralizar na localização do usuário (com consentimento).
export const MAP_DEFAULT_CENTER = {
  latitude: -10.4433,
  longitude: -45.1628,
  zoom: 14,
  cityLabel: "Corrente, PI",
} as const;

