"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { LISTING_CATEGORIES, MAP_DEFAULT_CENTER, type ListingCategoryValue } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import { CategoryIcon, categoryTone } from "@/components/icons/CategoryIcon";
import type { MapSeller } from "@/server/queries/sellers";

// Cores dos pins por categoria (tokens do design: green / yellow / olive).
const PIN: Record<ListingCategoryValue, { fill: string; stroke: string; ico: string }> = {
  MARKET: { fill: "#2f7d4a", stroke: "#ffffff", ico: "#ffffff" },
  CRAFT: { fill: "#f2b84b", stroke: "#8a5a0a", ico: "#1f2933" },
  FARM: { fill: "#55631f", stroke: "#ffffff", ico: "#ffffff" },
};

const PIN_PATH: Record<ListingCategoryValue, string> = {
  MARKET: "M4 10l1.5-5h13L20 10M4 10a2.67 2.67 0 005.33 0 2.67 2.67 0 005.34 0A2.67 2.67 0 0020 10M6 13v6h12v-6",
  CRAFT: "M12 3l7 9-7 9-7-9zM5 12h14",
  FARM: "M12 21v-9M12 12c0-4 3-7 8-7 0 5-3 8-8 7zM12 15c0-3-2-5-7-5 0 4 3 6 7 5z",
};

function categoryLabel(value: ListingCategoryValue): string {
  return LISTING_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

function buildIcon(category: ListingCategoryValue): L.DivIcon {
  const c = PIN[category];
  const html = `<svg viewBox="0 0 36 46" width="36" height="46" aria-hidden="true"><path d="M18 44S4 28.5 4 17a14 14 0 1128 0c0 11.5-14 27-14 27z" style="fill:${c.fill};stroke:${c.stroke};stroke-width:2"></path><path transform="translate(9.5 8.5) scale(0.7)" d="${PIN_PATH[category]}" style="fill:none;stroke:${c.ico};stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"></path></svg>`;
  return L.divIcon({ className: "fp-leaflet-pin", html, iconSize: [36, 46], iconAnchor: [18, 44], popupAnchor: [0, -40] });
}

// Captura a instância do mapa via useMap (padrão estável no react-leaflet v5).
function MapController({ mapRef }: { mapRef: MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>;
}

export function MapView({ sellers }: { sellers: MapSeller[] }) {
  const [activeCategory, setActiveCategory] = useState<ListingCategoryValue | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [locationDenied, setLocationDenied] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  function locateUser() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        mapRef.current?.flyTo([position.coords.latitude, position.coords.longitude], 15);
        setLocationDenied(false);
      },
      () => setLocationDenied(true),
      { timeout: 10000 },
    );
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sellers.filter((seller) => {
      if (activeCategory !== "ALL" && seller.category !== activeCategory) return false;
      if (!term) return true;
      return (
        seller.displayName.toLowerCase().includes(term) ||
        (seller.address ?? "").toLowerCase().includes(term) ||
        categoryLabel(seller.category).toLowerCase().includes(term)
      );
    });
  }, [sellers, activeCategory, search]);

  const icons = useMemo(() => {
    const map = {} as Record<ListingCategoryValue, L.DivIcon>;
    for (const category of LISTING_CATEGORIES) map[category.value] = buildIcon(category.value);
    return map;
  }, []);

  function handleFilter(category: ListingCategoryValue | "ALL") {
    setActiveCategory(category);
    trackEvent("filter_applied", { category });
  }

  function clearFilters() {
    setActiveCategory("ALL");
    setSearch("");
  }

  return (
    <div className="fp-map-layout">
      <aside className="fp-map-side" aria-label="Vendedores">
        <div className="fp-map-side-head">
          <span className="fp-eyebrow">{MAP_DEFAULT_CENTER.cityLabel}</span>
          <h1 className="fp-h1">Quem vende perto de você</h1>
        </div>

        <label className="fp-search fp-map-search">
          <SearchIcon />
          <input
            type="search"
            className="fp-input"
            aria-label="Buscar vendedor ou produto"
            placeholder="Buscar vendedor ou produto"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              trackEvent("search_performed");
            }}
          />
        </label>

        <div className="fp-map-filters" role="group" aria-label="Filtrar por categoria">
          <button type="button" className="fp-chip" aria-pressed={activeCategory === "ALL"} onClick={() => handleFilter("ALL")}>
            Todos
          </button>
          {LISTING_CATEGORIES.map((category) => (
            <button
              key={category.value}
              type="button"
              className="fp-chip"
              aria-pressed={activeCategory === category.value}
              onClick={() => handleFilter(category.value)}
            >
              <CategoryIcon value={category.value} className="fp-ico fp-ico--sm" />
              {category.label}
            </button>
          ))}
        </div>

        {locationDenied ? (
          <div className="fp-map-locnote" role="status">
            <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true" style={{ flex: "none", stroke: "var(--amber-dark)" }}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
            <div>
              <span className="fp-map-locnote-title">Não achamos você no mapa</span>
              <span>Sem acesso à sua localização, mostramos o centro de {MAP_DEFAULT_CENTER.cityLabel} e os endereços no lugar das distâncias.</span>
              <button type="button" className="fp-btn fp-btn--quiet fp-map-locnote-btn" onClick={locateUser}>Tentar de novo</button>
            </div>
          </div>
        ) : null}

        {/* Lista = alternativa acessível aos pins (tudo que está no mapa está aqui). */}
        {filtered.length === 0 ? (
          <div className="fp-empty fp-map-empty">
            <span className="fp-iconbox fp-iconbox--lg"><SearchIcon /></span>
            <h2 className="fp-h3">Nenhum vendedor encontrado</h2>
            <p>Tente outra palavra ou veja todas as categorias.</p>
            <button type="button" className="fp-btn fp-btn--quiet" onClick={clearFilters}>Limpar filtros</button>
          </div>
        ) : (
          <div className="fp-map-list">
            <span className="fp-caption">{filtered.length} {filtered.length === 1 ? "vendedor" : "vendedores"} por perto</span>
            <ul className="fp-map-list-ul">
              {filtered.map((seller) => (
                <li key={seller.id}>
                  <Link href={`/vendedor/${seller.id}`} className="fp-card fp-card--link fp-vendor" onClick={() => trackEvent("seller_opened", { sellerId: seller.id })}>
                    <span className={`fp-iconbox fp-iconbox--${categoryTone(seller.category)}`}>
                      <CategoryIcon value={seller.category} />
                    </span>
                    <span className="fp-vendor-body">
                      <span className="fp-vendor-top">
                        <span className="fp-vendor-name">{seller.displayName}</span>
                        {seller.isVerified ? (
                          <span className="fp-badge fp-badge--verified">
                            <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                            Verificado
                          </span>
                        ) : null}
                      </span>
                      <span className="fp-caption">{categoryLabel(seller.category)}</span>
                      {seller.address ? <span className="fp-caption">{seller.address}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <div className="fp-map-canvas">
        <div className="fp-maptool">
          <span className="fp-maptool-city">{MAP_DEFAULT_CENTER.cityLabel}</span>
          <button type="button" className="fp-btn fp-btn--quiet fp-maptool-btn" onClick={locateUser} aria-label="Centralizar na minha localização">
            <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
            Minha localização
          </button>
        </div>
        <MapContainer
          center={[MAP_DEFAULT_CENTER.latitude, MAP_DEFAULT_CENTER.longitude]}
          zoom={MAP_DEFAULT_CENTER.zoom}
          scrollWheelZoom
          className="fp-map-leaflet"
        >
          <MapController mapRef={mapRef} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filtered.map((seller) => (
            <Marker key={seller.id} position={[seller.latitude, seller.longitude]} icon={icons[seller.category]}>
              <Popup>
                <span className={`fp-badge fp-badge--${categoryTone(seller.category)}`}>{categoryLabel(seller.category)}</span>
                <strong className="fp-popup-name">{seller.displayName}</strong>
                {seller.address ? <span className="fp-caption">{seller.address}</span> : null}
                <Link href={`/vendedor/${seller.id}`} className="fp-link" onClick={() => trackEvent("seller_opened", { sellerId: seller.id })}>
                  Ver perfil
                </Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
