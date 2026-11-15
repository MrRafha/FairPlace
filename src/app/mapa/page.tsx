import { Suspense } from "react";

import { getMapSellers } from "@/server/queries/sellers";
import { getCurrentSellerProfile } from "@/server/actions/sellerContext";
import { MapLoader } from "@/features/map/MapLoader";
import { AppHeader } from "@/components/layout/AppHeader";

async function MapHeader() {
  const seller = await getCurrentSellerProfile();
  return <AppHeader isSeller={Boolean(seller)} />;
}

// O acesso ao banco fica dentro de <Suspense> por causa do cacheComponents:
// o Next renderiza o resto da página e faz stream dos vendedores.
async function MapData() {
  const sellers = await getMapSellers();
  return <MapLoader sellers={sellers} />;
}

export default function MapaPage() {
  return (
    <main id="conteudo-principal" className="fp-page fp-page--map">
      <Suspense fallback={<AppHeader />}>
        <MapHeader />
      </Suspense>

      <Suspense fallback={<div className="fp-map-loading" role="status">Carregando o mapa...</div>}>
        <MapData />
      </Suspense>
    </main>
  );
}
