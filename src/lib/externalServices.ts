// Liga/desliga serviços externos de terceiros (Cloudflare Turnstile e Google
// Analytics). Em dev ficam DESLIGADOS por padrão, para o app rodar em qualquer
// rede (inclusive bloqueada/offline), junto com o fallback de banco em
// src/lib/prisma.ts. Em produção estão sempre ligados (se as chaves existirem).
//
// Para testar captcha/GA em dev: NEXT_PUBLIC_DEV_EXTERNAL_SERVICES="on" no .env.
// (NEXT_PUBLIC_ porque o widget e o GA rodam no client; reinicie o `next dev`.)

export const externalServicesEnabled =
  process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_DEV_EXTERNAL_SERVICES === "on";

export const TURNSTILE_SITE_KEY = externalServicesEnabled ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY : undefined;

export const GA_MEASUREMENT_ID = externalServicesEnabled ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID : undefined;
