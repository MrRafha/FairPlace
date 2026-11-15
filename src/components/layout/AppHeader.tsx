"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

type CreateAction = { label: string; description: string; onSelect: () => void; tone?: "feira" | "artesanato" | "plain" };

export function AppHeader({
  isSeller = false,
  currentAccount = false,
  createActions,
}: {
  isSeller?: boolean;
  currentAccount?: boolean;
  // Quando fornecido, o botão Criar abre um menu com estas ações (usado no painel).
  // Quando ausente mas isSeller, o botão Criar é um link para o painel.
  createActions?: CreateAction[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="fp-header">
      <Link href="/mapa" className="fp-wordmark">FairPlace</Link>
      <nav className="fp-header-nav" aria-label="Conta">
        {isSeller && createActions && createActions.length > 0 ? (
          <div className="fp-create" ref={menuRef}>
            <button
              type="button"
              className="fp-btn fp-btn--primary fp-create-trigger"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Criar
            </button>
            {menuOpen ? (
              <div className="fp-create-menu" role="menu">
                {createActions.map((action, index) => (
                  <button
                    key={action.label}
                    type="button"
                    role="menuitem"
                    className={`fp-create-item${index === createActions.length - 1 ? " fp-create-item--last" : ""}`}
                    onClick={() => {
                      setMenuOpen(false);
                      action.onSelect();
                    }}
                  >
                    <span className={`fp-iconbox${action.tone === "artesanato" ? " fp-iconbox--artesanato" : action.tone === "plain" ? " fp-iconbox--plain" : ""}`}>
                      <CreateGlyph tone={action.tone} />
                    </span>
                    <span className="fp-create-item-text">
                      <span className="fp-create-item-title">{action.label}</span>
                      <span className="fp-create-item-desc">{action.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : isSeller ? (
          <Link href="/vendedor/painel" className="fp-btn fp-btn--primary">
            <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Criar
          </Link>
        ) : null}
        <Link
          href="/conta"
          className={`fp-navlink${currentAccount ? " fp-navlink--current" : ""}`}
          aria-current={currentAccount ? "page" : undefined}
        >
          Minha conta
        </Link>
        <button type="button" className="fp-navlink fp-navlink--ghost" onClick={() => signOut({ callbackUrl: "/" })}>
          Sair
        </button>
      </nav>
    </header>
  );
}

function CreateGlyph({ tone }: { tone?: "feira" | "artesanato" | "plain" }) {
  if (tone === "artesanato") {
    return <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5l3 3L8 19zM14 7l3 3" /></svg>;
  }
  if (tone === "plain") {
    return <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M4 10l1.5-5h13L20 10M4 10a2.67 2.67 0 005.33 0 2.67 2.67 0 005.34 0A2.67 2.67 0 0020 10M6 13v6h12v-6" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></svg>;
}
