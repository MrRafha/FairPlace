"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { getSellerPreview, type SellerPreview } from "@/server/actions/sellerPreview";
import { FavoriteButton } from "@/components/auth/FavoriteButton";
import { CategoryIcon, categoryTone } from "@/components/icons/CategoryIcon";
import { LISTING_CATEGORIES, type ListingCategoryValue } from "@/lib/constants";
import { formatWeekdays, todayWeekday } from "@/lib/weekdays";

function categoryLabel(value: ListingCategoryValue): string {
  return LISTING_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function directionsLink(place: { latitude: number | null; longitude: number | null; address: string | null }): string | null {
  if (place.latitude !== null && place.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
  }
  if (place.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
  return null;
}

type State = { status: "loading" } | { status: "error" } | { status: "ready"; seller: SellerPreview };

// Cópia da última versão vista de cada loja: reabrir mostra algo na hora,
// enquanto a versão atual é buscada no servidor.
const cache = new Map<string, SellerPreview>();

/** Painel lateral com o resumo da loja, aberto a partir do mapa. */
export function SellerPanel({ sellerId, onClose }: { sellerId: string; onClose: () => void }) {
  const cached = cache.get(sellerId);
  const [state, setState] = useState<State>(cached ? { status: "ready", seller: cached } : { status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [sellerId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Sempre busca do servidor: o cache só serve para exibir algo na hora
  // (stale-while-revalidate), senão edições feitas no painel não apareceriam.
  useEffect(() => {
    let cancelled = false;
    getSellerPreview(sellerId)
      .then((seller) => {
        if (cancelled) return;
        if (!seller) {
          cache.delete(sellerId);
          setState({ status: "error" });
          return;
        }
        cache.set(sellerId, seller);
        setState({ status: "ready", seller });
      })
      .catch(() => {
        // Sem rede: se já havia uma cópia na tela, mantém ela em vez de mostrar erro.
        if (!cancelled && !cache.has(sellerId)) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [sellerId, reloadKey]);

  return (
    <aside className="fp-sellerpanel" aria-label="Perfil da loja" aria-busy={state.status === "loading"}>
      <div className="fp-sellerpanel-bar">
        <span className="fp-eyebrow">Perfil da loja</span>
        <button ref={closeRef} type="button" className="fp-dialog-close" aria-label="Fechar perfil" onClick={onClose}>
          <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div className="fp-sellerpanel-scroll">
        {state.status === "loading" ? (
          <div className="fp-sellerpanel-skeleton" role="status">
            <span className="fp-skel fp-skel--avatar" />
            <span className="fp-skel fp-skel--title" />
            <span className="fp-skel fp-skel--line" />
            <span className="fp-skel fp-skel--line fp-skel--short" />
            <span className="fp-sr-only">Carregando perfil...</span>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="fp-empty">
            <h3 className="fp-h3">Não foi possível carregar a loja</h3>
            <button
              type="button"
              className="fp-btn fp-btn--quiet"
              onClick={() => {
                setState({ status: "loading" });
                setReloadKey((key) => key + 1);
              }}
            >
              Tentar de novo
            </button>
          </div>
        ) : null}

        {state.status === "ready" ? <SellerPanelContent seller={state.seller} /> : null}
      </div>
    </aside>
  );
}

function SellerPanelContent({ seller }: { seller: SellerPreview }) {
  const tone = categoryTone(seller.category);
  const today = todayWeekday();
  const todayLocation = seller.locations.find((location) => location.weekdays.includes(today));
  const directions = todayLocation ? directionsLink(todayLocation) : directionsLink(seller);

  return (
    <>
      <section className="fp-sellerpanel-hero">
        <span className={`fp-iconbox fp-iconbox--lg fp-iconbox--${tone}`} role="img" aria-label="Loja sem foto">
          <CategoryIcon value={seller.category} />
        </span>
        <div className="fp-sellerpanel-hero-info">
          <div className="fp-profile-badges">
            <span className={`fp-badge fp-badge--${tone}`}>{categoryLabel(seller.category)}</span>
            {seller.isVerified ? (
              <span className="fp-badge fp-badge--verified">
                <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                Verificado
              </span>
            ) : null}
          </div>
          <h2 className="fp-h2">{seller.displayName}</h2>
        </div>
      </section>

      {seller.description ? <p className="fp-sellerpanel-desc">{seller.description}</p> : null}

      {todayLocation || seller.address || seller.openingHours ? (
        <ul className="fp-sellerpanel-facts">
          {todayLocation ? (
            <li>
              <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M12 21s-7-6.5-7-11.5a7 7 0 0114 0C19 14.5 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
              <span><strong>Hoje em:</strong> {todayLocation.label}{todayLocation.address ? ` · ${todayLocation.address}` : ""}</span>
            </li>
          ) : seller.address ? (
            <li>
              <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M12 21s-7-6.5-7-11.5a7 7 0 0114 0C19 14.5 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
              <span>{seller.address}</span>
            </li>
          ) : null}
          {seller.openingHours ? (
            <li>
              <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              <span>{seller.openingHours}</span>
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="fp-sellerpanel-actions">
        {seller.phone ? (
          <a href={whatsappLink(seller.phone)} target="_blank" rel="noopener noreferrer" className="fp-btn fp-btn--primary">
            <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M4 19l1.4-4A7.5 7.5 0 1112 19.5a7.4 7.4 0 01-3.6-.9z" /></svg>
            WhatsApp
          </a>
        ) : null}
        {directions ? (
          <a href={directions} target="_blank" rel="noopener noreferrer" className="fp-btn fp-btn--quiet">Como chegar</a>
        ) : null}
        <FavoriteButton key={seller.id} sellerId={seller.id} initialFavorited={seller.favorited} />
      </div>

      <section className="fp-sellerpanel-section" aria-labelledby="sp-produtos">
        <h3 className="fp-h3" id="sp-produtos">Produtos disponíveis</h3>
        {seller.listings.length === 0 ? (
          <p className="fp-caption">Esta loja ainda não cadastrou produtos.</p>
        ) : (
          <ul className="fp-sellerpanel-products">
            {seller.listings.map((listing) => (
              <li key={listing.id} className="fp-sellerpanel-product">
                <span className="fp-sellerpanel-product-name">{listing.title}</span>
                <span className="fp-sellerpanel-product-price">{formatPrice(listing.price)}</span>
              </li>
            ))}
          </ul>
        )}
        {seller.totalListings > seller.listings.length ? (
          <span className="fp-caption">+ {seller.totalListings - seller.listings.length} na página da loja</span>
        ) : null}
      </section>

      {seller.locations.length > 0 ? (
        <section className="fp-sellerpanel-section" aria-labelledby="sp-locais">
          <h3 className="fp-h3" id="sp-locais">Onde encontrar</h3>
          <ul className="fp-sellerpanel-locs">
            {seller.locations.map((location) => (
              <li key={location.id}>
                <span className="fp-sellerpanel-loc-name">
                  {location.label}
                  {location.weekdays.includes(today) ? <span className="fp-badge fp-badge--verified">Hoje</span> : null}
                </span>
                <span className="fp-caption">{formatWeekdays(location.weekdays)}{location.address ? ` · ${location.address}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {seller.posts.length > 0 ? (
        <section className="fp-sellerpanel-section" aria-labelledby="sp-novidades">
          <h3 className="fp-h3" id="sp-novidades">Novidades</h3>
          <ul className="fp-sellerpanel-posts">
            {seller.posts.map((post) => (
              <li key={post.id}>
                <p>{post.text}</p>
                <time dateTime={post.createdAt} className="fp-caption">{formatDate(post.createdAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link href={`/vendedor/${seller.id}`} className="fp-btn fp-btn--quiet fp-sellerpanel-full">
        Ver página completa da loja
        <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </Link>
    </>
  );
}
