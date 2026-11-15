// Helper de eventos do Google Analytics (GA4).
// Só envia eventos quando o gtag foi carregado — o que, por sua vez, só acontece
// após o consentimento de cookies (ver CookieConsent.tsx). Nunca envie dados
// sensíveis (senha, e-mail, etc.) como parâmetro de evento.

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: "event", action: string, params?: GtagParams) => void;
  }
}

export type AnalyticsEvent =
  | "search_performed"
  | "filter_applied"
  | "seller_opened"
  | "listing_opened"
  | "favorite_created"
  | "registration_completed";

export function trackEvent(event: AnalyticsEvent, params?: GtagParams) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("event", event, params);
}
