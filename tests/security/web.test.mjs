// Auditoria de segurança — Frente B (camada web/cliente, configuração e dependências).
//
// Como rodar (sem instalar nada; usa só node:test + node:assert):
//
//   node --test tests/security/
//
// Testes HTTP (opcionais) rodam apenas se FAIRPLACE_URL estiver definido, ex.:
//
//   npx next dev -p 3100            # em outro terminal
//   FAIRPLACE_URL=http://localhost:3100 node --test tests/security/      (bash)
//   $env:FAIRPLACE_URL="http://localhost:3100"; node --test tests/security/   (PowerShell)
// Contra um deploy de produção, acrescente FAIRPLACE_ENV=production (exige HSTS
// e health sem databaseMode).
//
// Convenção: um teste que FALHA aponta uma fragilidade real encontrada na
// auditoria. A mensagem de erro diz o que está errado e como corrigir.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
const require = createRequire(path.join(ROOT, "package.json"));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (name === "generated" || name === "node_modules") continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?|mjs)$/.test(name)) out.push(full);
  }
  return out;
}
const SRC_FILES = walk(path.join(ROOT, "src"));
const rel = (f) => path.relative(ROOT, f).replaceAll("\\", "/");

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// ---------------------------------------------------------------------------
// 1. XSS no popup do Leaflet (MapView.tsx monta HTML como string)
// ---------------------------------------------------------------------------

function loadPopupHelpers() {
  const source = read("src/features/map/MapView.tsx");
  const start = source.indexOf("function escapeHtml");
  const end = source.indexOf("function SearchIcon");
  assert.ok(start > 0 && end > start, "Não achei escapeHtml/popupHtml em MapView.tsx (o teste precisa ser atualizado).");
  // Remove as anotações de tipo TypeScript usadas nessas duas funções.
  const js = source.slice(start, end).replace(/:\s*(string|MapSeller)\b/g, "");
  const factory = new Function(
    "categoryTone",
    "categoryLabel",
    `${js}\nreturn { escapeHtml, popupHtml };`,
  );
  return { source: source.slice(start, end), ...factory(() => "green", (v) => String(v)) };
}

const XSS_PAYLOADS = [
  `<img src=x onerror=alert(1)>`,
  `"><svg onload=alert(1)>`,
  `' onmouseover='alert(1)`,
  `</span><script>alert(1)</script>`,
  `javascript:alert(1)`,
  `&lt;img src=x onerror=alert(1)&gt;`, // dupla-decodificação
];

describe("XSS — popup do mapa (MapView.tsx)", () => {
  const { escapeHtml, popupHtml, source } = loadPopupHelpers();

  test("escapeHtml neutraliza < > & \"", () => {
    assert.equal(escapeHtml(`<a href="x">&`), "&lt;a href=&quot;x&quot;&gt;&amp;");
  });

  test("popupHtml não gera tags nem atributos extras com dados do vendedor", () => {
    for (const payload of XSS_PAYLOADS) {
      const html = popupHtml({
        id: `ck123${payload}`,
        category: "MARKET",
        displayName: payload,
        address: payload,
        locationLabel: payload,
      });
      const tags = [...html.matchAll(/<([a-zA-Z][\w-]*)/g)].map((m) => m[1].toLowerCase());
      assert.deepEqual(
        [...new Set(tags)].sort(),
        ["a", "div", "span", "strong"],
        `payload ${JSON.stringify(payload)} injetou tag: ${html}`,
      );
      const anchor = html.match(/<a\s([^>]*)>/)[1];
      const attrs = [...anchor.matchAll(/([\w-]+)="([^"]*)"/g)];
      assert.equal(
        attrs.map((m) => m[0]).join(" "),
        anchor.trim(),
        `atributos do <a> fora do formato name="valor": ${anchor}`,
      );
      assert.deepEqual(attrs.map((m) => m[1]), ["class", "data-seller-link", "href"]);
      const href = attrs.find((m) => m[1] === "href")[2];
      assert.ok(href.startsWith("/vendedor/"), `href não é relativo ao app: ${href}`);
    }
  });

  test("todo atributo do template usa aspas duplas (ou escapeHtml cobre aspas simples)", () => {
    const singleQuotedAttr = /=\s*'\$\{/.test(source);
    const escapesSingle = /'\\''|&#39;|&#x27;/.test(source);
    assert.ok(
      !singleQuotedAttr || escapesSingle,
      "popupHtml usa atributo com aspas simples, mas escapeHtml não escapa ' — XSS por quebra de atributo.",
    );
  });
});

describe("XSS — sinks de HTML cru em src/", () => {
  test("sem dangerouslySetInnerHTML / innerHTML / outerHTML / insertAdjacentHTML / document.write", () => {
    const hits = [];
    for (const file of SRC_FILES) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write\(/.test(line)) {
          hits.push(`${rel(file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    assert.deepEqual(hits, [], `Sinks de HTML cru encontrados (sanitize ou troque por JSX):\n${hits.join("\n")}`);
  });

  test("Leaflet: bindPopup/setContent/bindTooltip só recebem popupHtml(...) (string escapada)", () => {
    const hits = [];
    for (const file of SRC_FILES) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/\.(bindPopup|setPopupContent|setContent|bindTooltip|setTooltipContent)\(([^)]*)/g)) {
        if (!/^\s*popupHtml\(/.test(m[2])) hits.push(`${rel(file)}: .${m[1]}(${m[2]}`);
      }
    }
    assert.deepEqual(hits, [], `Conteúdo HTML do Leaflet sem escape:\n${hits.join("\n")}`);
  });

  test("links wa.me só recebem dígitos e Google Maps usa encodeURIComponent", () => {
    for (const f of ["src/app/vendedor/[id]/page.tsx", "src/features/map/SellerPanel.tsx"]) {
      const s = read(f);
      assert.match(s, /phone\.replace\(\/\\D\/g, ""\)/, `${f}: whatsappLink deve remover tudo que não é dígito`);
      assert.match(s, /query=\$\{encodeURIComponent\([a-z]+\.address\)\}/, `${f}: endereço deve passar por encodeURIComponent`);
      for (const m of s.matchAll(/target="_blank"([^>]*)/g)) {
        assert.match(m[1], /rel="noopener noreferrer"/, `${f}: target=_blank sem rel=noopener`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Imagens enviadas pelo usuário (imageUrl) + next/image
// ---------------------------------------------------------------------------

describe("imageUrl controlado pelo usuário", () => {
  test("schema de imageUrl aceita só https:// (bloqueia javascript:, data:, file:, http://IP-interno)", () => {
    // Carrega o schema REAL (transpilado pelo harness da frente A), em vez de
    // avaliar o texto do fonte — assim validadores importados também valem.
    const h = require("./tests/security/_harness.cjs");
    const { listingSchema, postSchema } = h.load("lib/validations/listing.ts");
    for (const schema of [listingSchema.shape.imageUrl, postSchema.shape.imageUrl]) {
      const accepted = [
        "javascript:alert(document.cookie)",
        "data:image/svg+xml,<svg onload=alert(1)>",
        "file:///etc/passwd",
        "http://169.254.169.254/latest/meta-data/",
        "http://localhost:3000/api/health",
      ].filter((u) => schema.safeParse(u).success);
      assert.deepEqual(
        accepted,
        [],
        `listing.ts: imageUrl aceita esquemas/hosts perigosos: ${accepted.join(", ")}. ` +
          `Use z.url({ protocol: /^https$/ }) (zod 4) e, de preferência, um allowlist de host.`,
      );
      assert.ok(schema.safeParse("https://images.example.com/a.jpg").success, "https legítimo deve continuar válido");
      assert.ok(schema.safeParse("").success, "string vazia deve continuar válida");
    }
  });

  test("next/image com imageUrl do usuário precisa de remotePatterns restritos (ou unoptimized)", () => {
    const page = read("src/app/vendedor/[id]/page.tsx");
    const config = read("next.config.ts");
    const usesRemote = /<Image[^>]+src=\{(listing|post)\.imageUrl\}/.test(page);
    if (!usesRemote) return;
    const hasPatterns = /remotePatterns\s*:/.test(config);
    const unoptimizedAtCall = /<Image[^>]+src=\{(listing|post)\.imageUrl\}[^>]*unoptimized/.test(page);
    assert.ok(
      hasPatterns || unoptimizedAtCall,
      "vendedor/[id]/page.tsx renderiza <Image src={imageUrl}> de qualquer host, mas next.config.ts não tem " +
        "images.remotePatterns: em dev a página do vendedor quebra (erro 'hostname is not configured'), " +
        "em produção o otimizador devolve 400 e a imagem some. Restrinja o host (ex.: seu bucket) em remotePatterns.",
    );
  });

  test("remotePatterns (se existir) não usa curinga de host nem http", () => {
    const config = read("next.config.ts");
    const block = config.match(/remotePatterns\s*:\s*\[([\s\S]*?)\]/);
    if (!block) return;
    assert.doesNotMatch(block[1], /hostname\s*:\s*["'](\*\*|\*)["']/, "hostname '**' transforma o /_next/image em proxy aberto (SSRF/abuso de banda)");
    assert.doesNotMatch(block[1], /protocol\s*:\s*["']http["']/, "use só protocol: 'https'");
    assert.doesNotMatch(config, /dangerouslyAllowLocalIP\s*:\s*true/, "dangerouslyAllowLocalIP: true reabre SSRF para IPs internos");
    assert.doesNotMatch(config, /dangerouslyAllowSVG\s*:\s*true/, "dangerouslyAllowSVG: true permite SVG com script");
  });
});

// ---------------------------------------------------------------------------
// 3. Headers de segurança (next.config.ts)
// ---------------------------------------------------------------------------

describe("headers de segurança em next.config.ts", () => {
  const config = read("next.config.ts");
  const REQUIRED = [
    ["Content-Security-Policy", "CSP ausente: sem segunda camada contra XSS e sem frame-ancestors."],
    ["Strict-Transport-Security", "HSTS ausente: permite downgrade para http no primeiro acesso."],
    ["X-Content-Type-Options", "nosniff ausente."],
    ["Referrer-Policy", "Referrer-Policy ausente (vaza path/ids para terceiros: OSM, Google)."],
    ["Permissions-Policy", "Permissions-Policy ausente: iframes de terceiros podem pedir geolocalização/câmera."],
  ];

  test("define async headers()", () => {
    assert.match(config, /headers\s*\(\s*\)/, "next.config.ts não define headers(): nenhum header de segurança é enviado.");
  });

  for (const [name, why] of REQUIRED) {
    test(`envia ${name}`, () => {
      assert.ok(config.includes(name), `${name}: ${why}`);
    });
  }

  test("anti-clickjacking (frame-ancestors ou X-Frame-Options)", () => {
    assert.ok(
      /frame-ancestors\s+'(none|self)'/.test(config) || /X-Frame-Options/.test(config),
      "Sem frame-ancestors/X-Frame-Options: /conta (excluir conta) e /vendedor/painel podem ser enquadrados (clickjacking).",
    );
  });

  test("Permissions-Policy libera geolocation só para self", () => {
    if (!config.includes("Permissions-Policy")) return assert.fail("Permissions-Policy ausente");
    assert.match(config, /geolocation=\(self\)/, "use geolocation=(self) (o mapa usa navigator.geolocation)");
  });

  test("CSP: object-src 'none', base-uri, sem curinga em script-src", () => {
    const csp = config.match(/script-src[^;"`]*/)?.[0];
    if (!csp) return assert.fail("CSP ausente");
    assert.doesNotMatch(csp, /\s\*(\s|$)|https:\s|http:\s/, "script-src com curinga anula a CSP");
    assert.match(config, /object-src 'none'/);
    assert.match(config, /base-uri 'self'|base-uri 'none'/);
  });

  test("poweredByHeader: false (não anuncia Next.js)", () => {
    assert.match(config, /poweredByHeader\s*:\s*false/, "Adicione poweredByHeader: false (informativo).");
  });
});

// ---------------------------------------------------------------------------
// 4. Segredos
// ---------------------------------------------------------------------------

describe("segredos", () => {
  test(".env.example só tem placeholders", () => {
    const env = read(".env.example");
    const vars = Object.fromEntries(
      env.split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
      }),
    );
    const db = vars.DATABASE_URL ?? "";
    assert.ok(!db || /USER:PASSWORD|ep-example/.test(db), "DATABASE_URL de .env.example parece real");
    for (const k of ["GOOGLE_CLIENT_SECRET", "TURNSTILE_SECRET_KEY"]) {
      const v = vars[k] ?? "";
      assert.ok(v === "" || /^1x0000000000000000000000000000000AA$/.test(v) || /change|example|your/i.test(v), `${k} em .env.example não é placeholder`);
    }
    assert.ok(/change-me|example|your|^$/i.test(vars.NEXTAUTH_SECRET ?? ""), "NEXTAUTH_SECRET em .env.example parece real");
    assert.doesNotMatch(env, /GOCSPX-|sk_live_|npg_[A-Za-z0-9]{8,}/, "padrão de credencial real em .env.example");
  });

  test(".gitignore ignora .env, .env.local, .env.production (e não ignora .env.example)", () => {
    const shouldIgnore = [".env", ".env.local", ".env.production", ".env.development.local"];
    const notIgnored = shouldIgnore.filter((f) => {
      try {
        git(["check-ignore", "-q", "--no-index", f]);
        return false;
      } catch {
        return true;
      }
    });
    assert.deepEqual(
      notIgnored,
      [],
      `.gitignore tem só ".env" (o commit 2e5309b trocou ".env*" por ".env"). Estes arquivos seriam commitados: ${notIgnored.join(", ")}. ` +
        `Use:\n.env*\n!.env.example`,
    );
    let exampleIgnored = true;
    try { git(["check-ignore", "-q", "--no-index", ".env.example"]); } catch { exampleIgnored = false; }
    assert.equal(exampleIgnored, false, ".env.example deve continuar versionado");
  });

  test("nenhum arquivo .env* (exceto .env.example) no histórico do git", () => {
    const names = git(["log", "--all", "--format=", "--name-only"]).split("\n").map((s) => s.trim()).filter(Boolean);
    const leaked = [...new Set(names.filter((n) => /(^|\/)\.env(\.|$)/.test(n) && !n.endsWith(".env.example")))];
    assert.deepEqual(leaked, [], `arquivos de ambiente já commitados: ${leaked.join(", ")} — rotacione as credenciais`);
  });

  test("arquivos versionados sem credenciais (Postgres com senha, Google OAuth secret, Stripe, Neon)", () => {
    let out = "";
    try {
      out = git(["grep", "-n", "-I", "-E",
        "postgres(ql)?://[^:@/\" ]+:[^@\" ]{6,}@|GOCSPX-[A-Za-z0-9_-]{10,}|sk_live_[A-Za-z0-9]{10,}|npg_[A-Za-z0-9]{10,}",
        "--", ".", ":!package-lock.json"]);
    } catch { out = ""; }
    const real = out.split("\n").filter(Boolean).filter((l) => !/USER:PASSWORD/.test(l));
    assert.deepEqual(real.map((l) => l.split(":").slice(0, 2).join(":")), [], "credencial em arquivo versionado");
  });
});

// ---------------------------------------------------------------------------
// 5. Rotas de API, consentimento, middleware
// ---------------------------------------------------------------------------

describe("rotas e cliente", () => {
  test("/api/health não expõe databaseMode em produção", () => {
    const s = read("src/app/api/health/route.ts");
    if (!s.includes("databaseMode")) return;
    assert.match(
      s,
      /NODE_ENV\s*[!=]==?\s*["'](production|development)["'][\s\S]{0,200}databaseMode|databaseMode[\s\S]{0,200}NODE_ENV/,
      "health/route.ts devolve databaseMode (e status do banco) para qualquer visitante, sem condição de ambiente.",
    );
  });

  test("/api/register exige Content-Type JSON ou valida Origin (CSRF por form text/plain)", () => {
    const s = read("src/app/api/register/route.ts");
    assert.ok(
      /content-type/i.test(s) || /headers\.get\(["']origin["']\)/i.test(s),
      "register/route.ts aceita qualquer Content-Type (request.json() ignora o header) e não confere Origin: " +
        "um <form enctype=text/plain> de outro site consegue postar JSON válido.",
    );
  });

  test("GA só é carregado após consentimento", () => {
    const s = read("src/components/privacy/CookieConsent.tsx");
    assert.match(s, /consent === "accepted" && GA_ID \? <GoogleAnalytics/);
    const otherGa = SRC_FILES.filter((f) => !f.endsWith("CookieConsent.tsx") && /googletagmanager|gtag\/js/.test(readFileSync(f, "utf8")));
    assert.deepEqual(otherGa.map(rel), [], "GA carregado fora do CookieConsent");
  });

  test("revogar o consentimento desliga o GA já carregado", () => {
    const s = read("src/components/privacy/CookieConsent.tsx");
    assert.ok(
      /ga-disable-|gtag\(\s*["']consent["']\s*,\s*["']update["']/.test(s),
      "Após aceitar e depois recusar, o <Script> do GA continua carregado (window.gtag existe) e trackEvent segue " +
        "enviando eventos até o reload; cookies _ga ficam. Use window['ga-disable-<ID>']=true / gtag('consent','update',...).",
    );
  });

  test("login não usa callbackUrl da query sem validação", () => {
    const s = read("src/app/login/page.tsx");
    if (/searchParams|callbackUrl\s*=|get\(["']callbackUrl["']\)/.test(s)) {
      assert.match(s, /startsWith\(["']\/["']\)[\s\S]{0,80}!.*startsWith\(["']\/\/["']\)|new URL\([^)]*\)\.origin/, "callbackUrl da query precisa ser validado como caminho relativo");
    }
  });

  test("next.config/auth não sobrescreve o callback redirect do NextAuth de forma insegura", () => {
    const s = read("src/lib/auth.ts");
    if (/redirect\s*\(\s*\{/.test(s)) {
      assert.match(s, /startsWith\(baseUrl\)|new URL\(url\)\.origin === baseUrl/, "callbacks.redirect precisa restringir ao baseUrl");
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Testes HTTP (opcionais) — só com FAIRPLACE_URL
// ---------------------------------------------------------------------------

const BASE = process.env.FAIRPLACE_URL?.replace(/\/$/, "");
// HSTS e o health enxuto só valem em produção (em `next dev` http://localhost
// o HSTS quebraria o navegador e o health mostra o modo do banco de propósito).
// Para auditar um deploy: FAIRPLACE_ENV=production.
const TARGET_IS_PROD = process.env.FAIRPLACE_ENV === "production";

describe("HTTP (FAIRPLACE_URL)", () => {
  const maybe = (name, fn) => test(name, { timeout: 180_000 }, async (t) => {
    if (!BASE) return t.skip("defina FAIRPLACE_URL para rodar");
    await fn(t);
  });

  maybe("GET / envia headers de segurança", async () => {
    const res = await fetch(`${BASE}/`, { redirect: "manual" });
    const missing = ["content-security-policy", ...(TARGET_IS_PROD ? ["strict-transport-security"] : []), "x-content-type-options", "referrer-policy", "permissions-policy"]
      .filter((h) => !res.headers.get(h));
    const frame = res.headers.get("x-frame-options") || /frame-ancestors/.test(res.headers.get("content-security-policy") ?? "");
    assert.deepEqual(missing, [], `headers ausentes na resposta: ${missing.join(", ")}`);
    assert.ok(frame, "sem X-Frame-Options/frame-ancestors");
  });

  maybe("X-Powered-By não é enviado", async () => {
    const res = await fetch(`${BASE}/`, { redirect: "manual" });
    assert.equal(res.headers.get("x-powered-by"), null, `x-powered-by: ${res.headers.get("x-powered-by")}`);
  });

  maybe("NextAuth recusa callbackUrl externo", async () => {
    const res = await fetch(`${BASE}/api/auth/signin?callbackUrl=${encodeURIComponent("https://evil.example/pwn")}`, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    const cookies = res.headers.getSetCookie?.() ?? [];
    assert.doesNotMatch(loc, /evil\.example/, `redirect para domínio externo: ${loc}`);
    assert.ok(!cookies.some((c) => /callback-url=[^;]*evil\.example/.test(decodeURIComponent(c))), "cookie callback-url aceitou domínio externo");
  });

  maybe("middleware redireciona rota privada para /login sem host externo", async () => {
    const res = await fetch(`${BASE}/conta`, { redirect: "manual", headers: { "x-forwarded-host": "evil.example" } });
    const loc = res.headers.get("location") ?? "";
    assert.ok(
      [302, 307, 308].includes(res.status),
      `GET /conta sem sessão devolveu ${res.status}: o withAuth de middleware.ts não interceptou ` +
        `(o redirect veio só da página, via stream/meta refresh). /mapa fica acessível sem login.`,
    );
    assert.doesNotMatch(loc, /evil\.example/, `Location usa host do atacante: ${loc}`);
  });

  maybe("/api/health não expõe databaseMode", async () => {
    const res = await fetch(`${BASE}/api/health`);
    const body = await res.json();
    if (TARGET_IS_PROD) assert.equal(body.databaseMode, undefined, `health expõe databaseMode=${body.databaseMode}`);
  });

  maybe("/api/register recusa POST cross-site text/plain", async () => {
    // Corpo propositalmente inválido (falha no zod) para não criar conta.
    const res = await fetch(`${BASE}/api/register`, {
      method: "POST",
      headers: { "content-type": "text/plain", origin: "https://evil.example" },
      body: JSON.stringify({ name: "", email: "csrf-probe", password: "x" }),
    });
    assert.ok(
      [403, 415].includes(res.status),
      `POST cross-site text/plain foi processado (status ${res.status}); deveria ser 403/415 antes de tocar o corpo`,
    );
  });
});

if (!existsSync(path.join(ROOT, "node_modules", "zod"))) {
  console.warn("[aviso] node_modules/zod ausente: o teste de imageUrl vai falhar por falta da lib, não por vulnerabilidade.");
}
