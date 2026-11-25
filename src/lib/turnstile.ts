// Verificação server-side do Cloudflare Turnstile.
// Nunca confie apenas no estado visual do widget — o token precisa ser
// validado no servidor contra a API do Turnstile.

import { externalServicesEnabled } from "@/lib/externalServices";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Único bypass: `next dev` (NODE_ENV=development exato) com os serviços
// externos desligados — o widget nem aparece. Staging/preview com outro
// NODE_ENV (test, vazio...) e produção SEMPRE verificam. Decidido uma vez,
// no carregamento, como o próprio externalServicesEnabled.
const DEV_BYPASS = process.env.NODE_ENV === "development" && !externalServicesEnabled;

export async function verifyTurnstileToken(token: unknown): Promise<boolean> {
  if (DEV_BYPASS) {
    return true;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return false; // sem chave fora do dev: falha fechado
  }

  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return false;
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await response.json()) as { success?: boolean; hostname?: string };
    if (data.success !== true) return false;
    // Opcional: amarra o token ao domínio do site (defina TURNSTILE_HOSTNAME em produção).
    const expectedHost = process.env.TURNSTILE_HOSTNAME;
    return !expectedHost || data.hostname === expectedHost;
  } catch {
    return false;
  }
}
