"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";

const CONSENT_KEY = "fairplace-cookie-consent-v2";
const CONSENT_COOKIE = "fairplace-consent";
const CONTRAST_KEY = "fairplace-contrast";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type Consent = "accepted" | "rejected" | null;
type Contrast = "default" | "high";

function parseConsent(value: string | null | undefined): Exclude<Consent, null> | null {
  return value === "accepted" || value === "rejected" ? value : null;
}

function getSavedConsent(): Consent {
  if (typeof window === "undefined") return null;

  const cookieValue = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];

  return parseConsent(cookieValue) ?? parseConsent(window.localStorage.getItem(CONSENT_KEY));
}

function getSavedContrast(): Contrast {
  return typeof window !== "undefined" && window.localStorage.getItem(CONTRAST_KEY) === "high"
    ? "high"
    : "default";
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1.3v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1.3l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-1.3-3.1h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 1.3-3.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3.1-1.3v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3.1 1.3l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 1.3 3.1h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-1.3 3.1Z" />
    </svg>
  );
}

export default function CookieConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [contrast, setContrast] = useState<Contrast>("default");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedConsent = getSavedConsent();
      const savedContrast = getSavedContrast();
      setConsent(savedConsent);
      setAnalyticsEnabled(savedConsent === "accepted");
      setContrast(savedContrast);
      setIsOpen(!savedConsent || !window.localStorage.getItem(CONTRAST_KEY));
    }, 0);

    const openPreferences = () => setIsOpen(true);
    window.addEventListener("fairplace:open-cookie-preferences", openPreferences);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("fairplace:open-cookie-preferences", openPreferences);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", contrast === "high");
  }, [contrast]);

  function savePreferences() {
    const nextConsent: Exclude<Consent, null> = analyticsEnabled ? "accepted" : "rejected";
    document.cookie = `${CONSENT_COOKIE}=${nextConsent}; Max-Age=31536000; Path=/; SameSite=Lax`;
    window.localStorage.setItem(CONSENT_KEY, nextConsent);
    window.localStorage.setItem(CONTRAST_KEY, contrast);
    document.documentElement.classList.toggle("high-contrast", contrast === "high");
    setConsent(nextConsent);
    setIsOpen(false);
  }

  return (
    <>
      {consent === "accepted" && GA_ID ? <GoogleAnalytics measurementId={GA_ID} /> : null}
      {isOpen ? (
        <aside className="cookie-preference-card" role="dialog" aria-modal="true" aria-labelledby="cookie-title" aria-describedby="cookie-description">
          <div className="cookie-preference-header">
            <div className="cookie-preference-icon"><GearIcon /></div>
            <div><p className="cookie-banner-title" id="cookie-title">Preferências de privacidade</p><p id="cookie-description">Escolha quais recursos opcionais o FairPlace pode utilizar.</p></div>
            <button type="button" className="cookie-close" aria-label="Fechar preferências" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="cookie-preference-option">
            <div><strong>Cookies necessários</strong><small>Funcionamento básico e salvamento das suas escolhas.</small></div>
            <span className="cookie-status">Sempre ativos</span>
          </div>
          <div className="cookie-preference-option">
            <div><strong>Google Analytics</strong><small>Ajuda a entender o uso da página. Você pode desativar.</small></div>
            <button type="button" className={`preference-toggle ${analyticsEnabled ? "is-on" : ""}`} aria-pressed={analyticsEnabled} onClick={() => setAnalyticsEnabled((enabled) => !enabled)}>{analyticsEnabled ? "Ativo" : "Desativado"}</button>
          </div>
          <fieldset className="contrast-choice">
            <legend>Contraste visual</legend>
            <button type="button" aria-pressed={contrast === "default"} onClick={() => setContrast("default")}>Padrão</button>
            <button type="button" aria-pressed={contrast === "high"} onClick={() => setContrast("high")}>Alto contraste</button>
          </fieldset>
          <Link className="cookie-details-link" href="/cookies">Ler aviso de cookies</Link>
          <button type="button" className="button button-dark cookie-save" onClick={savePreferences}>Salvar preferências</button>
        </aside>
      ) : null}
      <button type="button" className="cookie-settings-button" aria-label="Abrir preferências de privacidade" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}><GearIcon /></button>
    </>
  );
}

function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
