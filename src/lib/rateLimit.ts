// Limitador de tentativas em memória (janela fixa).
//
// LIMITAÇÃO: o contador vive na memória do processo. Num servidor único (ou no
// `next dev`) funciona; em serverless com várias instâncias cada uma conta
// separado. Para produção em escala, trocar por um store compartilhado
// (Upstash Redis ou uma tabela no Postgres) mantendo esta mesma interface.

type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as unknown as { __fpRateLimit?: Map<string, Bucket> };
const buckets = (globalStore.__fpRateLimit ??= new Map<string, Bucket>());

const MAX_KEYS = 50_000;

function sweep(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Registra uma tentativa para `key` e diz se ela passou do limite.
 * Ex.: `rateLimit("login:ip:1.2.3.4", 20, 15 * 60_000)`.
 */
export function rateLimit(key: string, max: number, windowMs: number): { limited: boolean; retryAfterMs: number } {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterMs: 0 };
  }
  bucket.count += 1;
  return { limited: bucket.count > max, retryAfterMs: bucket.resetAt - now };
}

/** Zera o contador (ex.: após um login bem-sucedido). */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** IP do cliente a partir dos headers de proxy (melhor esforço). */
export function clientIp(headers: Headers | Record<string, string | string[] | undefined> | undefined | null): string {
  if (!headers) return "desconhecido";
  const get = (name: string): string | undefined => {
    if (typeof (headers as Headers).get === "function") return (headers as Headers).get(name) ?? undefined;
    const value = (headers as Record<string, string | string[] | undefined>)[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || get("x-real-ip")?.trim() || "desconhecido";
}
