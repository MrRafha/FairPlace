"use client";

import dynamic from "next/dynamic";

import type { MapSeller } from "@/server/queries/sellers";

// Leaflet usa `window` — precisa ser carregado só no client. Como `ssr: false`
// no next/dynamic só é permitido em Client Components, isolamos o dynamic aqui.
const MapView = dynamic(() => import("@/features/map/MapView").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => <div className="map-loading" role="status">Carregando o mapa...</div>,
});

export function MapLoader({ sellers }: { sellers: MapSeller[] }) {
  return <MapView sellers={sellers} />;
}
