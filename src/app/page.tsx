"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { LISTING_CATEGORIES } from "@/lib/constants";

function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "brand-mark brand-mark-small" : "brand-mark"} aria-hidden="true">
      <Image
        src="/logo-favicon.svg"
        alt=""
        width={small ? 48 : 65}
        height={small ? 24 : 32}
        priority={!small}
      />
    </span>
  );
}

function PageLogo() {
  return <Image className="page-logo" src="/FP.svg" alt="" width={62} height={62} priority />;
}

function ArrowUpRight() {
  return <span aria-hidden="true">↗</span>;
}

function CategoryIcon({ type }: { type: "craft" | "market" | "farm" }) {
  if (type === "craft") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5 12 4l7 4.5-7 4-7-4Z" /><path d="M5 12.5 12 17l7-4.5M5 16.5l7 4 7-4" /></svg>;
  }
  if (type === "market") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16M6 10l1-5h10l1 5M6 10v9h12v-9M9 14h6" /><path d="M4 10c0 1.4 1 2.5 2.3 2.5S8.5 11.4 8.5 10c0 1.4 1 2.5 2.3 2.5s2.3-1.1 2.3-2.5c0 1.4 1 2.5 2.3 2.5s2.3-1.1 2.3-2.5c0 1.4 1 2.5 2.3 2.5S20 11.4 20 10" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V9M12 9c-1.2-3.1-4-4.6-6.5-4.5.1 2.7 1.8 5 5 5.5M12 12c1.1-2.7 3.3-4 5.7-3.9-.1 2.3-1.6 4.2-4.4 4.7" /><path d="M7 20h10" /></svg>;
}

function StepIcon({ type }: { type: "discover" | "know" | "talk" }) {
  if (type === "discover") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4" /></svg>;
  if (type === "know") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19s-7-4.2-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 1.8C19 14.8 12 19 12 19Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

const categories = LISTING_CATEGORIES.map((category) => ({
  type: category.icon,
  name: category.label,
  count: category.countLabel,
}));

const markers = [
  { left: "18%", top: "38%", type: "craft" as const, tone: "yellow" },
  { left: "45%", top: "29%", type: "market" as const, tone: "green" },
  { left: "73%", top: "40%", type: "farm" as const, tone: "yellow" },
  { left: "34%", top: "63%", type: "market" as const, tone: "green" },
  { left: "78%", top: "70%", type: "craft" as const, tone: "green" },
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  useEffect(() => {
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>(".reveal-on-scroll"));
    const steps = Array.from(document.querySelectorAll<HTMLElement>(".step"));
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("step-visible");
      }),
      { threshold: 0.35 },
    );
    const sectionObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-revealed");
      }),
      { threshold: 0.15 },
    );
    steps.forEach((step) => observer.observe(step));
    revealTargets.forEach((target) => sectionObserver.observe(target));
    return () => {
      observer.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  return (
    <main id="conteudo-principal">
      <section className="hero-section">
        <nav className="site-nav shell" aria-label="Navegação principal">
          <Link className="wordmark" href="/" aria-label="FairPlace, início">
            <PageLogo />
            <span><b>Fair</b><em>Place</em></span>
          </Link>
          <div className="nav-links">
            <a href="#como-funciona">Como funciona</a>
            <a href="#categorias">Categorias</a>
            <Link href="#vendedores">Sou vendedor</Link>
          </div>
          <Link className="nav-login" href="/login">Entrar</Link>
        </nav>

        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> Feira, artesanato e agricultura local</p>
            <h1>Encontre o que é <span>feito por perto.</span></h1>
            <p className="hero-description">
              Descubra alimentos, produtos artesanais e produtores da sua região.
              Converse direto com quem faz e fortaleça a economia local.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#explorar">Explorar minha região <ArrowUpRight /></a>
              <a className="button button-quiet" href="#como-funciona">Entenda como funciona</a>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true"><i>J</i><i>M</i><i>A</i><i>+</i></div>
              <span><strong>+ de 160 vendedores</strong><br />já fazem parte da rede local</span>
            </div>
          </div>

          <div className="map-visual" id="explorar" role="region" aria-label="Prévia do mapa de vendedores locais">
            <div className="map-topbar">
              <div className="map-brand"><Mark small /><strong>FairPlace</strong></div>
              <button className="profile-button" aria-label="Abrir perfil">JD</button>
            </div>
            <button type="button" className="map-search" aria-label="Pesquisar vendedores e produtos"><SearchIcon /><span>O que você está procurando?</span><b aria-hidden="true">⌘ K</b></button>
            <div className="map-canvas">
              <div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" />
              <div className="map-block block-one" /><div className="map-block block-two" /><div className="map-block block-three" />
              {markers.map((marker) => <span key={`${marker.left}-${marker.top}`} className={`map-marker ${marker.tone}`} style={{ left: marker.left, top: marker.top }}><CategoryIcon type={marker.type} /></span>)}
              <div className="map-card">
                <div className="map-card-image"><CategoryIcon type="craft" /></div>
                <div><strong>Ateliê da Joana</strong><small>Artesanato · 1,2 km</small><span className="available">● Aberto agora</span></div>
                <span className="card-arrow">↗</span>
              </div>
              <span className="map-label label-one">Centro</span><span className="map-label label-two">Vila Nova</span>
            </div>
            <div className="map-controls" aria-label="Controles do mapa"><button type="button" aria-label="Aumentar zoom">＋</button><button type="button" aria-label="Diminuir zoom">−</button><button type="button" className="locate" aria-label="Encontrar minha localização">⌖</button></div>
            <div className="map-caption"><span className="caption-pulse" /> <strong>{selectedCategory === "Todos" ? "18 lojas" : "9 lojas"}</strong> de {selectedCategory === "Todos" ? "produção local" : selectedCategory.toLowerCase()} <span>↗</span></div>
          </div>
        </div>
      </section>

      <section className="category-section shell" id="categorias">
        <div className="section-heading reveal-on-scroll"><div><p className="eyebrow">Explore do seu jeito</p><h2>Produção local, <em>de verdade.</em></h2></div><a className="text-link" href="#explorar">Ver no mapa <ArrowUpRight /></a></div>
        <div className="category-filter reveal-on-scroll" aria-label="Filtrar categorias"><button type="button" aria-pressed={selectedCategory === "Todos"} className={selectedCategory === "Todos" ? "filter-active" : ""} onClick={() => setSelectedCategory("Todos")}>Todos</button>{categories.map((category) => <button type="button" aria-pressed={selectedCategory === category.name} className={selectedCategory === category.name ? "filter-active" : ""} onClick={() => setSelectedCategory(category.name)} key={category.name}>{category.name}</button>)}</div>
        <div className="category-grid reveal-on-scroll">{categories.map((category) => <button type="button" aria-pressed={selectedCategory === category.name} className={`category-card ${selectedCategory === category.name ? "category-selected" : ""}`} onClick={() => setSelectedCategory(category.name)} key={category.name}><span className="category-icon"><CategoryIcon type={category.type} /></span><strong>{category.name}</strong><small>{category.count}</small><span className="category-arrow">↗</span></button>)}</div>
      </section>

      <section className="how-section reveal-on-scroll" id="como-funciona">
        <div className="shell">
          <div className="section-heading centered"><p className="eyebrow">Simples assim</p><h2>Do mapa para a sua <em>nova descoberta.</em></h2><p>O FairPlace aproxima quem procura de quem faz, sem complicar.</p></div>
          <div className="steps-grid">
            <div className="step"><span>01</span><div className="step-icon"><StepIcon type="discover" /></div><h3>Descubra</h3><p>Abra o mapa e encontre feiras, artesãos e produtores locais ao seu redor.</p></div>
            <div className="step"><span>02</span><div className="step-icon"><StepIcon type="know" /></div><h3>Conheça</h3><p>Veja a vitrine, os produtos e o jeito de trabalhar de cada vendedor.</p></div>
            <div className="step"><span>03</span><div className="step-icon"><StepIcon type="talk" /></div><h3>Converse</h3><p>Fale direto com quem vende e combine sua compra sem intermediários.</p></div>
          </div>
        </div>
      </section>

      <section className="seller-section shell reveal-on-scroll" id="vendedores">
        <div className="seller-card">
          <div><p className="eyebrow">Para quem faz acontecer</p><h2>Seu trabalho merece<br /><em>ser encontrado.</em></h2><p>Crie sua vitrine digital, mostre seus produtos e conecte-se a novos clientes da sua região.</p><Link className="button button-dark" href="/login">Quero ser vendedor <ArrowUpRight /></Link></div>
          <div className="seller-art" aria-hidden="true"><Image className="seller-logo-image" src="/logo-favicon.svg" alt="" width={250} height={125} /><small>feito perto<br /><b>é feito com cuidado</b></small></div>
        </div>
      </section>

      <footer className="site-footer shell reveal-on-scroll">
        <Link className="wordmark" href="/"><PageLogo /><span><b>Fair</b><em>Place</em></span></Link>
        <p>Conectando pequenos vendedores aos consumidores locais.</p>
        <nav className="footer-links" aria-label="Links legais"><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><Link href="/cookies">Cookies</Link><button type="button" onClick={() => window.dispatchEvent(new Event("fairplace:open-cookie-preferences"))}>Preferências de cookies</button></nav>
        <span>© 2026 FairPlace</span>
      </footer>
    </main>
  );
}
