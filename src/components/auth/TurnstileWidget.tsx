"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void; theme?: string },
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) {
      return;
    }

    function renderWidget() {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) {
        return;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY as string,
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onVerify(""),
      });
    }

    renderWidget();
    const interval = window.setInterval(renderWidget, 300);
    return () => window.clearInterval(interval);
  }, [onVerify]);

  // Sem site key configurada, não renderiza o widget (o placeholder visual do
  // formulário permanece). A verificação server-side libera o fluxo em dev.
  if (!SITE_KEY) {
    return null;
  }

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div ref={containerRef} className="turnstile-widget" />
    </>
  );
}
