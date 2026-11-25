"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { LISTING_CATEGORIES, MAP_DEFAULT_CENTER, type ListingCategoryValue } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import { CategoryIcon, categoryTone } from "@/components/icons/CategoryIcon";
import type { MapSeller } from "@/server/queries/sellers";
import { SellerPanel } from "@/features/map/SellerPanel";

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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] ?? ch));
}

function popupHtml(seller: MapSeller): string {
  const tone = categoryTone(seller.category);
  const addr = seller.address ? `<span class="fp-caption">${escapeHtml(seller.address)}</span>` : "";
  return `<div class="fp-popup"><span class="fp-badge fp-badge--${tone}">${escapeHtml(categoryLabel(seller.category))}</span>` +
    `<strong class="fp-popup-name">${escapeHtml(seller.displayName)}</strong>` +
    (seller.locationLabel ? `<span class="fp-caption">${escapeHtml(seller.locationLabel)}</span>` : "") +
    addr +
    `<a class="fp-link" data-seller-link="${escapeHtml(seller.id)}" href="/vendedor/${escapeHtml(seller.id)}">Ver perfil</a></div>`;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>;
}

export function MapView({ sellers }: { sellers: MapSeller[] }) {
  const [activeCategory, setActiveCategory] = useState<ListingCategoryValue | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [locationDenied, setLocationDenied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  // Loja aberta no painel lateral (null = painel fechado).
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sellers.filter((seller) => {
      if (activeCategory !== "ALL" && seller.category !== activeCategory) return false;
      if (!term) return true;
      return (
        seller.displayName.toLowerCase().includes(term) ||
        (seller.address ?? "").toLowerCase().includes(term) ||
        (seller.locationLabel ?? "").toLowerCase().includes(term) ||
        categoryLabel(seller.category).toLowerCase().includes(term)
      );
    });
  }, [sellers, activeCategory, search]);

  // Cria o mapa com Leaflet puro (imune ao bug de HMR/StrictMode do react-leaflet).
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      [MAP_DEFAULT_CENTER.latitude, MAP_DEFAULT_CENTER.longitude],
      MAP_DEFAULT_CENTER.zoom,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // "Ver perfil" no popup abre o painel lateral em vez de sair do mapa
    // (Ctrl/Cmd+clique continua abrindo a página completa em outra aba).
    function onPopupClick(event: MouseEvent) {
      const target = (event.target as HTMLElement)?.closest("[data-seller-link]") as HTMLAnchorElement | null;
      if (!target || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      const id = target.dataset.sellerLink;
      if (id) {
        setSelectedId(id);
        trackEvent("seller_opened", { sellerId: id });
      }
    }
    map.getContainer().addEventListener("click", onPopupClick);

    return () => {
      map.getContainer().removeEventListener("click", onPopupClick);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Atualiza os marcadores quando o filtro muda.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    for (const seller of filtered) {
      const marker = L.marker([seller.latitude, seller.longitude], { icon: buildIcon(seller.category), title: seller.displayName })
        .bindPopup(popupHtml(seller))
        .addTo(layer);
      markersRef.current.set(seller.locationId, marker);
    }
  }, [filtered]);

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

  function handleFilter(category: ListingCategoryValue | "ALL") {
    setActiveCategory(category);
    trackEvent("filter_applied", { category });
  }

  // Card da lista: abre o painel e leva o mapa até o ponto daquele dia.
  function openFromList(event: React.MouseEvent<HTMLAnchorElement>, seller: MapSeller) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setSelectedId(seller.id);
    trackEvent("seller_opened", { sellerId: seller.id });
    const map = mapRef.current;
    const marker = markersRef.current.get(seller.locationId);
    if (map && marker) {
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.6 });
      marker.openPopup();
    }
  }

  const closePanel = useCallback(() => setSelectedId(null), []);

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
            <span className="fp-caption">{filtered.length} {filtered.length === 1 ? "ponto" : "pontos"} de venda hoje</span>
            <ul className="fp-map-list-ul">
              {filtered.map((seller) => (
                <li key={seller.locationId}>
                  <Link
                    href={`/vendedor/${seller.id}`}
                    className={selectedId === seller.id ? "fp-card fp-card--link fp-vendor fp-vendor--active" : "fp-card fp-card--link fp-vendor"}
                    aria-current={selectedId === seller.id ? "true" : undefined}
                    onClick={(event) => openFromList(event, seller)}
                  >
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
                      <span className="fp-caption">{categoryLabel(seller.category)}{seller.locationLabel ? ` · ${seller.locationLabel}` : ""}</span>
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
        <div ref={containerRef} className="fp-map-leaflet" />
        {selectedId ? <SellerPanel key={selectedId} sellerId={selectedId} onClose={closePanel} /> : null}
      </div>
    </div>
  );
}
