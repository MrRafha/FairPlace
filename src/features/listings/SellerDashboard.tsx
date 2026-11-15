"use client";

import { useState, useTransition } from "react";

import Link from "next/link";

import { deleteListing, setListingAvailability, type ActionResult } from "@/server/actions/listings";
import { deletePost } from "@/server/actions/posts";
import { NewListingDialog } from "@/features/listings/NewListingDialog";
import { NewPostDialog } from "@/features/listings/NewPostDialog";
import { SellerProfileForm, type SellerProfileFormData } from "@/features/listings/SellerProfileForm";
import { CategoryIcon, categoryTone } from "@/components/icons/CategoryIcon";
import { LISTING_CATEGORIES, type ListingCategoryValue } from "@/lib/constants";

function categoryLabel(value: ListingCategoryValue): string {
  return LISTING_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

export type DashboardSeller = {
  id: string;
  displayName: string;
  category: ListingCategoryValue;
  isVerified: boolean;
};

export type DashboardListing = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: ListingCategoryValue;
  available: boolean;
};

export type DashboardPost = {
  id: string;
  text: string;
  createdAt: string;
};

type Tab = "produtos" | "publicacoes" | "vitrine";

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function SellerDashboard({
  seller,
  listings,
  posts,
  profile,
}: {
  seller: DashboardSeller;
  listings: DashboardListing[];
  posts: DashboardPost[];
  profile: SellerProfileFormData;
}) {
  const [tab, setTab] = useState<Tab>("produtos");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [listingDialog, setListingDialog] = useState(false);
  const [postDialog, setPostDialog] = useState(false);

  const availableCount = listings.filter((listing) => listing.available).length;
  const tone = categoryTone(seller.category);

  function runAction(action: () => Promise<ActionResult>) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Não foi possível concluir a ação.");
    });
  }

  return (
    <>
      <section className="fp-card fp-dash-hero" aria-label="Sua vitrine">
        <span className={`fp-iconbox fp-iconbox--lg fp-iconbox--${tone}`} role="img" aria-label="Vitrine sem foto">
          <CategoryIcon value={seller.category} />
        </span>
        <div className="fp-dash-hero-info">
          <span className="fp-eyebrow">Painel do vendedor</span>
          <h1 className="fp-h1">{seller.displayName}</h1>
          <div className="fp-dash-hero-badges">
            <span className={`fp-badge fp-badge--${tone}`}>{categoryLabel(seller.category)}</span>
            {seller.isVerified ? (
              <span className="fp-badge fp-badge--verified">
                <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                Verificado
              </span>
            ) : null}
            <Link href={`/vendedor/${seller.id}`} className="fp-link">Ver perfil público</Link>
          </div>
        </div>
        <div className="fp-dash-hero-actions">
          <button type="button" className="fp-btn fp-btn--quiet" onClick={() => setPostDialog(true)}>
            <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5l3 3L8 19zM14 7l3 3" /></svg>
            Nova publicação
          </button>
          <button type="button" className="fp-btn fp-btn--primary" onClick={() => setListingDialog(true)}>
            <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Novo produto
          </button>
        </div>
      </section>

      <div className="fp-tabs" role="tablist" aria-label="Seções do painel">
        <button type="button" role="tab" className="fp-tab" aria-selected={tab === "produtos"} onClick={() => setTab("produtos")}>Produtos · {listings.length}</button>
        <button type="button" role="tab" className="fp-tab" aria-selected={tab === "publicacoes"} onClick={() => setTab("publicacoes")}>Publicações · {posts.length}</button>
        <button type="button" role="tab" className="fp-tab" aria-selected={tab === "vitrine"} onClick={() => setTab("vitrine")}>Dados da vitrine</button>
      </div>

      {error ? <p className="fp-error" role="alert">{error}</p> : null}

      {tab === "produtos" ? (
        <section role="tabpanel" aria-label="Produtos" className="fp-dash-panel">
          <div className="fp-dash-panel-head">
            <span className="fp-caption">{availableCount} de {listings.length} {listings.length === 1 ? "produto disponível" : "produtos disponíveis"} hoje</span>
            <button type="button" className="fp-btn fp-btn--primary" onClick={() => setListingDialog(true)}>
              <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Novo produto
            </button>
          </div>
          {listings.length === 0 ? (
            <div className="fp-empty"><h3 className="fp-h3">Nenhum produto ainda</h3><p>Adicione o primeiro item da sua vitrine.</p></div>
          ) : (
            <ul className="fp-dash-list">
              {listings.map((listing) => (
                <li key={listing.id} className="fp-card fp-dash-item">
                  <span className="fp-dash-thumb" role="img" aria-label="Produto"><CategoryIcon value={listing.category} /></span>
                  <div className="fp-dash-item-info">
                    <span className="fp-dash-item-name">{listing.title}</span>
                    {listing.description ? <span className="fp-caption">{listing.description}</span> : null}
                    <span className="fp-dash-item-price">{formatPrice(listing.price)}</span>
                  </div>
                  <label className="fp-switch">
                    <input
                      type="checkbox"
                      checked={listing.available}
                      disabled={isPending}
                      onChange={(event) => runAction(() => setListingAvailability(listing.id, event.target.checked))}
                    />
                    {listing.available ? "Disponível" : "Indisponível"}
                  </label>
                  <button
                    type="button"
                    className="fp-iconbtn"
                    aria-label={`Excluir ${listing.title}`}
                    disabled={isPending}
                    onClick={() => runAction(() => deleteListing(listing.id))}
                  >
                    <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "publicacoes" ? (
        <section role="tabpanel" aria-label="Publicações" className="fp-dash-panel">
          <div className="fp-dash-panel-head">
            <span className="fp-caption">{posts.length} {posts.length === 1 ? "publicação" : "publicações"}</span>
            <button type="button" className="fp-btn fp-btn--primary" onClick={() => setPostDialog(true)}>
              <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Nova publicação
            </button>
          </div>
          {posts.length === 0 ? (
            <div className="fp-empty"><h3 className="fp-h3">Nenhuma publicação ainda</h3><p>Conte uma novidade da sua banca.</p></div>
          ) : (
            <ul className="fp-dash-list">
              {posts.map((post) => (
                <li key={post.id} className="fp-card fp-dash-item">
                  <div className="fp-dash-item-info">
                    <p className="fp-dash-post-text">{post.text}</p>
                    <span className="fp-caption">{post.createdAt}</span>
                  </div>
                  <button
                    type="button"
                    className="fp-iconbtn"
                    aria-label="Excluir publicação"
                    disabled={isPending}
                    onClick={() => runAction(() => deletePost(post.id))}
                  >
                    <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "vitrine" ? (
        <section role="tabpanel" aria-label="Dados da vitrine">
          <SellerProfileForm profile={profile} />
        </section>
      ) : null}

      <NewListingDialog open={listingDialog} onClose={() => setListingDialog(false)} />
      <NewPostDialog open={postDialog} onClose={() => setPostDialog(false)} />
    </>
  );
}
