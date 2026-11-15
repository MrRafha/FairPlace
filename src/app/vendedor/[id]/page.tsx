import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { getSellerProfile } from "@/server/queries/sellerProfile";
import { isFavorited } from "@/server/actions/favorites";
import { getCurrentSellerProfile } from "@/server/actions/sellerContext";
import { FavoriteButton } from "@/components/auth/FavoriteButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { CategoryIcon, categoryTone } from "@/components/icons/CategoryIcon";
import { LISTING_CATEGORIES, type ListingCategoryValue } from "@/lib/constants";

function categoryLabel(value: ListingCategoryValue): string {
  return LISTING_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function directionsLink(seller: { latitude: number | null; longitude: number | null; address: string | null }): string | null {
  if (seller.latitude !== null && seller.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${seller.latitude},${seller.longitude}`;
  }
  if (seller.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(seller.address)}`;
  }
  return null;
}

export default function SellerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main id="conteudo-principal" className="fp-page">
      <Suspense fallback={<AppHeader />}>
        <ProfileHeader />
      </Suspense>
      <Suspense fallback={<div className="fp-profile"><p className="fp-caption">Carregando perfil...</p></div>}>
        <SellerProfileContent params={params} />
      </Suspense>
    </main>
  );
}

async function ProfileHeader() {
  const current = await getCurrentSellerProfile();
  return <AppHeader isSeller={Boolean(current)} />;
}

async function SellerProfileContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seller = await getSellerProfile(id);

  if (!seller) {
    notFound();
  }

  const favorited = await isFavorited(seller.id);
  const tone = categoryTone(seller.category);
  const directions = directionsLink(seller);

  return (
    <div className="fp-profile">
      <Link href="/mapa" className="fp-link fp-profile-back">
        <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        Voltar ao mapa
      </Link>

      <section className="fp-card fp-profile-hero" aria-label="Sobre o vendedor">
        <span className={`fp-iconbox fp-iconbox--xl fp-iconbox--${tone}`} role="img" aria-label="Vendedor sem foto">
          <CategoryIcon value={seller.category} />
        </span>
        <div className="fp-profile-hero-info">
          <div className="fp-profile-badges">
            <span className={`fp-badge fp-badge--${tone}`}>{categoryLabel(seller.category)}</span>
            {seller.isVerified ? (
              <span className="fp-badge fp-badge--verified">
                <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                Verificado
              </span>
            ) : null}
          </div>
          <h1 className="fp-h1">{seller.displayName}</h1>
          {seller.description ? <p className="fp-profile-desc">{seller.description}</p> : null}
          {seller.address ? <span className="fp-caption">{seller.address}</span> : null}
        </div>
        <div className="fp-profile-actions">
          {seller.phone ? (
            <a href={whatsappLink(seller.phone)} target="_blank" rel="noopener noreferrer" className="fp-btn fp-btn--primary">
              <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M4 19l1.4-4A7.5 7.5 0 1112 19.5a7.4 7.4 0 01-3.6-.9z" /></svg>
              Falar no WhatsApp
            </a>
          ) : null}
          <div className="fp-profile-actions-row">
            {directions ? (
              <a href={directions} target="_blank" rel="noopener noreferrer" className="fp-btn fp-btn--quiet">Como chegar</a>
            ) : null}
            <FavoriteButton sellerId={seller.id} initialFavorited={favorited} />
          </div>
        </div>
      </section>

      <section className="fp-profile-section" aria-labelledby="h-produtos">
        <div className="fp-profile-head">
          <span className="fp-eyebrow">Da vitrine</span>
          <h2 className="fp-h2" id="h-produtos">Produtos disponíveis</h2>
        </div>
        {seller.listings.length === 0 ? (
          <div className="fp-empty">
            <span className={`fp-iconbox fp-iconbox--lg fp-iconbox--${tone}`}><CategoryIcon value={seller.category} /></span>
            <h3 className="fp-h3">Ainda sem produtos por aqui</h3>
            <p>Esta vitrine ainda não cadastrou produtos. Volte em breve ou fale direto com o vendedor.</p>
          </div>
        ) : (
          <div className="fp-product-grid">
            {seller.listings.map((listing) => (
              <article key={listing.id} className="fp-card fp-product">
                <div className="fp-product-img" role="img" aria-label="Foto do produto">
                  {listing.imageUrl ? (
                    <Image src={listing.imageUrl} alt={listing.title} width={240} height={180} />
                  ) : (
                    <CategoryIcon value={listing.category} className="fp-ico fp-ico--lg" />
                  )}
                </div>
                <div className="fp-product-body">
                  <h3 className="fp-product-name">{listing.title}</h3>
                  {listing.description ? <span className="fp-caption">{listing.description}</span> : null}
                  <span className="fp-product-price">{formatPrice(listing.price)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="fp-profile-section" aria-labelledby="h-feed">
        <div className="fp-profile-head">
          <span className="fp-eyebrow">Novidades</span>
          <h2 className="fp-h2" id="h-feed">Atualizações</h2>
        </div>
        {seller.posts.length === 0 ? (
          <div className="fp-empty">
            <span className="fp-iconbox fp-iconbox--lg"><svg viewBox="0 0 24 24" className="fp-ico fp-ico--lg" aria-hidden="true"><path d="M4 19l1.4-4A7.5 7.5 0 1112 19.5a7.4 7.4 0 01-3.6-.9z" /></svg></span>
            <h3 className="fp-h3">Nenhuma publicação ainda</h3>
            <p>Quando a vitrine tiver novidades, elas aparecem aqui.</p>
          </div>
        ) : (
          <div className="fp-feed">
            {seller.posts.map((post) => (
              <article key={post.id} className="fp-card fp-post">
                <div className="fp-post-head">
                  <span className="fp-post-name">{seller.displayName}</span>
                  <time dateTime={post.createdAt.toISOString()} className="fp-caption">{formatDate(post.createdAt)}</time>
                </div>
                <p className="fp-post-text">{post.text}</p>
                {post.imageUrl ? <Image src={post.imageUrl} alt="" width={640} height={320} className="fp-post-img-real" /> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="fp-profile-section" aria-labelledby="h-contato" id="contato">
        <h2 className="fp-h2" id="h-contato">Localização e contato</h2>
        <div className="fp-card fp-contact">
          {seller.address ? (
            <div className="fp-contact-item">
              <span className="fp-iconbox"><svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M12 21s-7-6.5-7-11.5a7 7 0 0114 0C19 14.5 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg></span>
              <div><span className="fp-contact-label">Endereço aproximado</span><span className="fp-muted">{seller.address}<br />{MAP_DEFAULT_CITY}</span></div>
            </div>
          ) : null}
          {seller.openingHours ? (
            <div className="fp-contact-item">
              <span className="fp-iconbox"><svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
              <div><span className="fp-contact-label">Horários</span><span className="fp-muted">{seller.openingHours}</span></div>
            </div>
          ) : null}
          {seller.phone ? (
            <div className="fp-contact-item">
              <span className="fp-iconbox"><svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M4 19l1.4-4A7.5 7.5 0 1112 19.5a7.4 7.4 0 01-3.6-.9z" /></svg></span>
              <div><span className="fp-contact-label">Telefone e WhatsApp</span><span className="fp-muted">{seller.phone}</span></div>
            </div>
          ) : null}
          {!seller.address && !seller.openingHours && !seller.phone ? (
            <p className="fp-muted" style={{ margin: 0 }}>O vendedor ainda não informou dados de contato.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

const MAP_DEFAULT_CITY = "Corrente, PI";
