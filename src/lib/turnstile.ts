// Verificação server-side do Cloudflare Turnstile.
// Nunca confie apenas no estado visual do widget — o token precisa ser
// validado no servidor contra a API do Turnstile.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Em ambiente de desenvolvimento sem chave configurada, não bloqueia o fluxo.
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  if (!token) {
    return false;
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await response.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
