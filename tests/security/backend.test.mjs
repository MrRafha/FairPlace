// Testes de segurança — FRENTE A: backend, autenticação e autorização.
//
// Como rodar (na raiz do projeto, sem dependências novas, sem banco, sem next dev):
//
//   node --test tests/security/
//
// Para rodar só este arquivo:  node --test tests/security/backend.test.mjs
//
// Como funciona: tests/security/_harness.cjs transpila os .ts REAIS de src/ com o
// `typescript` do projeto e resolve o alias `@/`. Prisma, sessão (getSession /
// getCurrentSellerProfile) e next/cache são trocados por mocks que registram as
// chamadas, então as server actions, o route handler de registro, o authorize do
// NextAuth e os schemas zod rodam com a lógica verdadeira.
//
// Convenção: os testes marcados [VULN] FALHAM hoje de propósito — cada um prova
// uma fragilidade real e a mensagem de falha diz qual é. Os marcados [OK] são
// guardas de regressão de controles que já estão corretos.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const h = require("./_harness.cjs");
const bcrypt = require("bcryptjs");

const noCache = { revalidatePath() {}, revalidateTag() {} };

async function withEnv(env, fn) {
  const previous = {};
  for (const [k, v] of Object.entries(env)) {
    previous[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// Carrega uma action com um vendedor autenticado (sellerProfile.id = sellerId).
function loadSellerAction(file, { sellerId = "seller-A", handlers = {} } = {}) {
  const db = h.fakePrisma(handlers);
  const mod = h.load(file, {
    mocks: {
      "@/lib/prisma": { prisma: db.client },
      "@/server/actions/sellerContext": {
        getCurrentSellerProfile: async () => (sellerId ? { id: sellerId, userId: `user-of-${sellerId}` } : null),
      },
      "next/cache": noCache,
    },
  });
  return { mod, db };
}

function loadUserAction(file, { userId = "user-A", handlers = {} } = {}) {
  const db = h.fakePrisma(handlers);
  const mod = h.load(file, {
    mocks: {
      "@/lib/prisma": { prisma: db.client },
      "@/lib/auth": { getSession: async () => h.fakeSession(userId), authOptions: {} },
      "next/cache": noCache,
    },
  });
  return { mod, db };
}

const writes = (db) => db.calls.filter((c) => /\.(create|update|updateMany|delete|deleteMany|upsert)$/.test(c.key));

// ---------------------------------------------------------------------------
// 1. NextAuth: authorize / callbacks (src/lib/auth.ts)
// ---------------------------------------------------------------------------
describe("auth.ts — login por credenciais e JWT", () => {
  function loadAuth(handlers) {
    const db = h.fakePrisma(handlers);
    const mod = h.load("lib/auth.ts", { mocks: { "@/lib/prisma": { prisma: db.client } } });
    const credentials = mod.authOptions.providers.find((p) => p.id === "credentials");
    return { authorize: credentials.options.authorize, authOptions: mod.authOptions, db };
  }

  test("[OK] authorize não devolve o hash da senha (nada sensível vai para o JWT)", async () => {
    const hash = bcrypt.hashSync("senha-correta-123", 4);
    const { authorize } = loadAuth({
      "user.findUnique": () => ({ id: "u1", name: "A", email: "a@a.com", image: null, role: "BUYER", password: hash }),
    });
    const user = await authorize({ email: "a@a.com", password: "senha-correta-123" });
    assert.deepEqual(Object.keys(user).sort(), ["email", "id", "image", "name", "role"]);
  });

  test("[OK] conta só-Google (password null) não loga por credenciais e não lança", async () => {
    const { authorize } = loadAuth({
      "user.findUnique": () => ({ id: "u1", email: "g@g.com", password: null, role: "BUYER" }),
    });
    assert.equal(await authorize({ email: "g@g.com", password: "qualquer" }), null);
  });

  test("[VULN] enumeração de usuário por tempo de resposta no login", async () => {
    const hash = bcrypt.hashSync("senha-correta-123", 10);
    const known = loadAuth({ "user.findUnique": () => ({ id: "u1", email: "a@a.com", password: hash, role: "BUYER" }) });
    let t = performance.now();
    await known.authorize({ email: "a@a.com", password: "senha-errada-000" });
    const tKnown = performance.now() - t;

    const unknown = loadAuth({ "user.findUnique": () => null });
    t = performance.now();
    await unknown.authorize({ email: "naoexiste@a.com", password: "senha-errada-000" });
    const tUnknown = performance.now() - t;

    assert.ok(
      tUnknown >= tKnown * 0.5,
      `authorize responde em ${tUnknown.toFixed(1)}ms para e-mail inexistente e ${tKnown.toFixed(1)}ms para e-mail ` +
        `existente: o bcrypt.compare só roda quando o usuário existe, então o tempo revela quais e-mails têm conta. ` +
        `Rode bcrypt.compare contra um hash fictício quando o usuário não existir.`,
    );
  });

  test("[VULN] e-mail não é normalizado (maiúsculas/espaços) no login", async () => {
    const { authorize, db } = loadAuth({ "user.findUnique": () => null });
    await authorize({ email: "  Vitima@Exemplo.com ", password: "x" });
    const lookup = db.calls.find((c) => c.key === "user.findUnique");
    assert.equal(
      lookup.args.where.email,
      "vitima@exemplo.com",
      "authorize busca o e-mail exatamente como digitado; registro faz só trim. 'Vitima@x.com' e 'vitima@x.com' viram contas distintas.",
    );
  });

  test("[VULN] callback jwt nunca revalida o usuário no banco (sem revogação de sessão)", async () => {
    const { authOptions, db } = loadAuth({ "user.findUnique": () => null }); // usuário apagado
    const token = await authOptions.callbacks.jwt({ token: { id: "u-apagado", role: "SELLER" } });
    const consulted = db.calls.some((c) => c.key.startsWith("user."));
    assert.ok(
      consulted || token == null || !token.id,
      "O JWT (validade padrão de 30 dias, session.maxAge não definido) continua válido após troca de senha ou " +
        "exclusão da conta: o callback jwt só copia id/role no login e nunca checa o banco. Um token roubado " +
        "sobrevive à troca de senha.",
    );
    assert.ok(
      (authOptions.session?.maxAge ?? 30 * 24 * 3600) <= 7 * 24 * 3600 || consulted,
      "session.maxAge não configurado (30 dias).",
    );
  });

  test("[VULN] login por credenciais sem rate limit / lockout / captcha", () => {
    const src = h.readSrc("lib/auth.ts");
    assert.ok(
      /rate.?limit|limiter|lockout|failedAttempts|loginAttempt|verifyTurnstileToken/i.test(src),
      "authorize() não tem nenhum limite de tentativas: /api/auth/callback/credentials aceita brute force e " +
        "credential stuffing ilimitados, e cada tentativa contra e-mail existente custa um bcrypt cost 12 (CPU DoS).",
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Registro (src/app/api/register/route.ts + src/lib/validations/auth.ts)
// ---------------------------------------------------------------------------
describe("registro", () => {
  const validBody = (over = {}) => ({
    name: "Fulano",
    email: "fulano@exemplo.com",
    password: "uma-senha-boa-9",
    passwordConfirmation: "uma-senha-boa-9",
    role: "buyer",
    ...over,
  });

  function loadRegister(handlers) {
    const db = h.fakePrisma(handlers);
    const mod = h.load("app/api/register/route.ts", {
      mocks: { "@/lib/prisma": { prisma: db.client } },
      env: { NODE_ENV: "development", NEXT_PUBLIC_DEV_EXTERNAL_SERVICES: undefined },
    });
    return { POST: mod.POST, db };
  }

  const post = (POST, body) =>
    POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" }, // como o cliente real (login/page.tsx)
        body: JSON.stringify(body),
      }),
    );

  test("[OK] não é possível se registrar como ADMIN", async () => {
    const { POST, db } = loadRegister();
    const res = await post(POST, validBody({ role: "admin" }));
    assert.equal(res.status, 400);
    const res2 = await post(POST, validBody({ role: "ADMIN" }));
    assert.equal(res2.status, 400);
    assert.equal(writes(db).length, 0);
  });

  test("[OK] mass assignment: campos extras (isVerified, userId, role interno) são descartados", async () => {
    const { POST, db } = loadRegister();
    const res = await post(
      POST,
      validBody({ role: "seller", product: "Queijo", category: "MARKET", isVerified: true, userId: "outro", id: "x" }),
    );
    assert.equal(res.status, 201);
    const userCreate = db.calls.find((c) => c.key === "user.create");
    const profileCreate = db.calls.find((c) => c.key === "sellerProfile.create");
    assert.deepEqual(Object.keys(userCreate.args.data).sort(), ["email", "name", "password", "role"]);
    assert.equal(userCreate.args.data.role, "SELLER");
    assert.ok(!("isVerified" in profileCreate.args.data), "isVerified não pode vir do cliente");
    assert.notEqual(profileCreate.args.data.userId, "outro");
  });

  test("[OK] a senha é gravada como hash bcrypt", async () => {
    const { POST, db } = loadRegister();
    await post(POST, validBody());
    const data = db.calls.find((c) => c.key === "user.create").args.data;
    assert.match(data.password, /^\$2[aby]\$12\$/);
  });

  test("[VULN] enumeração de usuário: e-mail existente responde diferente de e-mail novo", async () => {
    const existing = loadRegister({ "user.findUnique": () => ({ id: "u1" }) });
    const r1 = await post(existing.POST, validBody());
    const fresh = loadRegister({ "user.findUnique": () => null });
    const r2 = await post(fresh.POST, validBody());
    const [b1, b2] = [await r1.json(), await r2.json()];
    assert.equal(
      r1.status,
      r2.status,
      `POST /api/register responde ${r1.status} "${b1.message}" para e-mail já cadastrado e ${r2.status} ` +
        `"${b2.message}" para e-mail novo: qualquer um descobre quem tem conta.`,
    );
  });

  test("[VULN] sem limite de tamanho: name/product/email gigantes são aceitos e gravados", async () => {
    const { POST, db } = loadRegister();
    const huge = "A".repeat(2 * 1024 * 1024); // 2 MB
    const res = await post(POST, validBody({ name: huge, role: "seller", product: huge, category: "MARKET" }));
    const created = db.calls.find((c) => c.key === "user.create");
    assert.ok(
      res.status >= 400 && !created,
      `Registro aceitou name e product de 2 MB (status ${res.status}). registerSchema não tem .max() em name, email ` +
        `e product (o product vira SellerProfile.description, que no painel é limitado a 600) e request.json() lê o ` +
        `corpo inteiro sem limite antes até da verificação do CAPTCHA.`,
    );
  });

  test("[VULN] política de senha: senhas triviais são aceitas", async () => {
    const { registerSchema } = h.load("lib/validations/auth.ts");
    const accepted = ["12345678", "password", "aaaaaaaa", "senha123"].filter(
      (pw) => registerSchema.safeParse(validBody({ password: pw, passwordConfirmation: pw })).success,
    );
    assert.deepEqual(accepted, [], `Senhas triviais aceitas no cadastro: ${accepted.join(", ")}`);
  });

  test("[VULN] senha > 72 bytes é truncada pelo bcrypt sem aviso", async () => {
    const { registerSchema } = h.load("lib/validations/auth.ts");
    const long = "x".repeat(72) + "PARTE-IGNORADA";
    const parsed = registerSchema.safeParse(validBody({ password: long, passwordConfirmation: long }));
    const hash = bcrypt.hashSync(long, 4);
    assert.ok(bcrypt.compareSync("x".repeat(72) + "QUALQUER-COISA", hash), "pré-condição: bcrypt trunca em 72 bytes");
    assert.equal(
      parsed.success,
      false,
      "registerSchema aceita senhas acima de 72 bytes; o bcrypt ignora o resto, então só os 72 primeiros bytes valem.",
    );
  });

  test("[VULN] e-mail não é convertido para minúsculas no cadastro", () => {
    const { registerSchema } = h.load("lib/validations/auth.ts");
    const parsed = registerSchema.parse(validBody({ email: "Vitima@Exemplo.COM" }));
    assert.equal(parsed.email, "vitima@exemplo.com", "Permite contas duplicadas por variação de maiúsculas.");
  });
});

// ---------------------------------------------------------------------------
// 3. Turnstile (src/lib/turnstile.ts + src/lib/externalServices.ts)
// ---------------------------------------------------------------------------
describe("Turnstile", () => {
  function loadTurnstile(env) {
    return h.load("lib/turnstile.ts", { env }).verifyTurnstileToken;
  }

  test("[OK] produção sem TURNSTILE_SECRET_KEY falha fechado", async () => {
    const env = { NODE_ENV: "production", TURNSTILE_SECRET_KEY: undefined };
    const verify = loadTurnstile(env);
    assert.equal(await withEnv(env, () => verify("qualquer-token")), false);
  });

  test("[OK] produção: sem token ou com resposta success:false é rejeitado; NEXT_PUBLIC_DEV_* não desliga", async () => {
    const env = { NODE_ENV: "production", TURNSTILE_SECRET_KEY: "s", NEXT_PUBLIC_DEV_EXTERNAL_SERVICES: "off" };
    const verify = loadTurnstile(env);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ success: false }));
    try {
      assert.equal(await withEnv(env, () => verify(undefined)), false);
      assert.equal(await withEnv(env, () => verify("tok")), false);
      assert.equal(await withEnv(env, () => verify({ toString: () => "x" })), false);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("[VULN] fora de NODE_ENV=production o CAPTCHA é ignorado mesmo com a chave secreta configurada", async () => {
    // Cenário: staging/preview rodando com NODE_ENV=test (ou um `next dev` exposto).
    const env = { NODE_ENV: "test", TURNSTILE_SECRET_KEY: "chave-real", NEXT_PUBLIC_DEV_EXTERNAL_SERVICES: undefined };
    const verify = loadTurnstile(env);
    let called = false;
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      called = true;
      return new Response(JSON.stringify({ success: false }));
    };
    try {
      const result = await withEnv(env, () => verify(undefined));
      assert.ok(
        result === false || called,
        "verifyTurnstileToken() devolve true sem token e sem consultar a Cloudflare sempre que NODE_ENV !== 'production', " +
          "mesmo com TURNSTILE_SECRET_KEY definida. O bypass depende só de NODE_ENV.",
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Server actions — autenticação, ownership (IDOR), mass assignment, tipos
// ---------------------------------------------------------------------------
describe("server actions", () => {
  const PUBLIC_ACTIONS = new Set(["getSellerPreview"]); // leitura pública intencional
  const AUTH_CALL = /\b(getSession|getCurrentSellerProfile|requireUserId)\s*\(/;

  test("[OK] toda action exportada (\"use server\") autentica antes de tocar no prisma", () => {
    const problems = [];
    for (const file of h.listSrc("server/actions")) {
      const src = h.readSrc(file);
      if (!/^\s*["']use server["']/m.test(src)) continue;
      const chunks = src.split(/\n(?=export\s+async\s+function\s)/);
      for (const chunk of chunks) {
        const m = chunk.match(/^export\s+async\s+function\s+(\w+)/);
        if (!m || PUBLIC_ACTIONS.has(m[1])) continue;
        const authAt = chunk.search(AUTH_CALL);
        const prismaAt = chunk.indexOf("prisma.");
        if (authAt === -1 || (prismaAt !== -1 && prismaAt < authAt)) problems.push(`${file}:${m[1]}`);
      }
    }
    assert.deepEqual(problems, [], `Actions sem verificação de sessão antes do banco: ${problems.join(", ")}`);
  });

  test("[OK] sellerContext.ts NÃO é \"use server\" (getCurrentSellerProfile não vira endpoint)", () => {
    assert.doesNotMatch(h.readSrc("server/actions/sellerContext.ts"), /^\s*["']use server["']/m);
  });

  test("[OK] todo update/delete de recurso do vendedor é restrito ao dono", () => {
    // Cada prisma.<model>.update/delete precisa de: where com sellerId/userId, OU checagem
    // `.sellerId !== seller.id` antes, OU where pelo id da sessão/perfil.
    const problems = [];
    for (const file of h.listSrc("server/actions")) {
      const src = h.readSrc(file);
      const chunks = src.split(/\n(?=export\s+async\s+function\s)/);
      for (const chunk of chunks) {
        const name = chunk.match(/^export\s+async\s+function\s+(\w+)/)?.[1];
        if (!name) continue;
        const re = /prisma\.(\w+)\.(update|updateMany|delete|deleteMany)\(\s*\{\s*where:\s*\{([^}]*)\}/g;
        for (const m of chunk.matchAll(re)) {
          const where = m[3];
          const scoped =
            /sellerId:\s*seller\.id|userId[,\s}:]|id:\s*(userId|seller\.id|existing\.id)/.test(where) ||
            /\.sellerId\s*!==\s*seller\.id/.test(chunk.slice(0, m.index));
          if (!scoped) problems.push(`${file}:${name} -> ${m[1]}.${m[2]}({ where: {${where.trim()}} })`);
        }
      }
    }
    assert.deepEqual(problems, [], `Escritas sem escopo de dono: ${problems.join(" | ")}`);
  });

  test("[OK] IDOR: vendedor A não altera/apaga produto, publicação ou local do vendedor B", async () => {
    const owned = () => ({ id: "obj-B", sellerId: "seller-B" });
    const handlers = {
      "listing.findUnique": owned,
      "sellerPost.findUnique": owned,
      "sellerLocation.updateMany": (a) => ({ count: a.where.sellerId === "seller-B" ? 1 : 0 }),
      "sellerLocation.deleteMany": (a) => ({ count: a.where.sellerId === "seller-B" ? 1 : 0 }),
    };
    const listing = h.formData({ title: "t", price: "1", category: "MARKET" });
    const postFd = h.formData({ text: "oi" });
    const loc = h.formData({ label: "L", latitude: "-10", longitude: "-45", weekdays: [1] });

    const cases = [
      ["server/actions/listings.ts", (m) => m.updateListing("obj-B", listing)],
      ["server/actions/listings.ts", (m) => m.deleteListing("obj-B")],
      ["server/actions/listings.ts", (m) => m.setListingAvailability("obj-B", false)],
      ["server/actions/posts.ts", (m) => m.updatePost("obj-B", postFd)],
      ["server/actions/posts.ts", (m) => m.deletePost("obj-B")],
      ["server/actions/locations.ts", (m) => m.updateLocation("obj-B", loc)],
      ["server/actions/locations.ts", (m) => m.deleteLocation("obj-B")],
    ];
    for (const [file, call] of cases) {
      const { mod, db } = loadSellerAction(file, { sellerId: "seller-A", handlers });
      const result = await call(mod);
      assert.equal(result.ok, false, `${file}: vendedor A conseguiu alterar recurso de B`);
      for (const w of writes(db)) {
        assert.equal(w.args.where.sellerId, "seller-A", `${file}: escrita sem escopo -> ${JSON.stringify(w.args)}`);
      }
    }
  });

  test("[OK] usuário sem perfil de vendedor (BUYER) não usa actions do painel", async () => {
    const files = ["listings.ts", "posts.ts", "locations.ts", "sellerProfile.ts"];
    for (const f of files) {
      const { mod, db } = loadSellerAction(`server/actions/${f}`, { sellerId: null });
      for (const [name, fn] of Object.entries(mod)) {
        if (typeof fn !== "function") continue;
        const r = await fn("x", h.formData({ title: "t", price: "1", category: "MARKET", text: "a", label: "l" }));
        assert.equal(r.ok, false, `${f}:${name} executou sem perfil de vendedor`);
      }
      assert.equal(db.calls.length, 0, `${f}: tocou no banco sem perfil de vendedor`);
    }
  });

  test("[OK] mass assignment: sellerId/isVerified/userId vindos do form são ignorados", async () => {
    const evil = { sellerId: "seller-B", isVerified: "true", userId: "user-B", id: "forjado" };
    {
      const { mod, db } = loadSellerAction("server/actions/listings.ts");
      await mod.createListing(h.formData({ title: "t", price: "1", category: "MARKET", ...evil }));
      const data = db.calls.find((c) => c.key === "listing.create").args.data;
      assert.equal(data.sellerId, "seller-A");
      assert.ok(!("isVerified" in data) && !("id" in data));
    }
    {
      const { mod, db } = loadSellerAction("server/actions/locations.ts");
      await mod.createLocation(h.formData({ label: "L", latitude: "-10", longitude: "-45", weekdays: [1], ...evil }));
      const data = db.calls.find((c) => c.key === "sellerLocation.create").args.data;
      assert.equal(data.sellerId, "seller-A");
      assert.deepEqual(Object.keys(data).sort(), ["address", "label", "latitude", "longitude", "sellerId", "weekdays"]);
    }
    {
      const { mod, db } = loadSellerAction("server/actions/sellerProfile.ts");
      await mod.updateSellerProfile(h.formData({ displayName: "D", category: "MARKET", ...evil }));
      const call = db.calls.find((c) => c.key === "sellerProfile.update");
      assert.equal(call.args.where.id, "seller-A");
      assert.ok(!("isVerified" in call.args.data) && !("userId" in call.args.data));
    }
    {
      const { mod, db } = loadUserAction("server/actions/account.ts");
      await mod.updateProfile(h.formData({ name: "N", role: "ADMIN", email: "outro@x.com", password: "x" }));
      const call = db.calls.find((c) => c.key === "user.update");
      assert.equal(call.args.where.id, "user-A");
      assert.deepEqual(Object.keys(call.args.data).sort(), ["image", "name"]);
    }
  });

  test("[VULN] ids não-string chegam ao Prisma (injeção de operador em updateMany/deleteMany)", async () => {
    // Server actions recebem argumentos serializados pelo React (objetos simples são aceitos).
    // `deleteLocation({ not: "" })` vira where { id: { not: "" }, sellerId } e apaga TODOS os locais.
    const payload = { not: "" };
    const loc = h.formData({ label: "L", latitude: "-10", longitude: "-45", weekdays: [1] });
    const cases = [
      ["server/actions/locations.ts", "deleteLocation", (m) => m.deleteLocation(payload)],
      ["server/actions/locations.ts", "updateLocation", (m) => m.updateLocation(payload, loc)],
      ["server/actions/listings.ts", "deleteListing", (m) => m.deleteListing(payload)],
      ["server/actions/posts.ts", "deletePost", (m) => m.deletePost(payload)],
    ];
    const reached = [];
    for (const [file, name, call] of cases) {
      const { mod, db } = loadSellerAction(file);
      await call(mod).catch(() => {});
      const hit = db.calls.find((c) => JSON.stringify(c.args?.where ?? {}).includes('"not"'));
      if (hit) reached.push(`${name} -> ${hit.key}(${JSON.stringify(hit.args.where)})`);
    }
    {
      const { mod, db } = loadUserAction("server/actions/favorites.ts");
      await mod.toggleFavorite(payload).catch(() => {});
      if (db.calls.length) reached.push(`toggleFavorite -> ${db.calls[0].key}`);
    }
    assert.deepEqual(
      reached,
      [],
      `Parâmetros de id sem checagem typeof === "string" chegaram ao Prisma: ${reached.join(" | ")}. ` +
        `Em updateMany/deleteMany o Prisma aceita o filtro, então um vendedor apaga/sobrescreve todos os próprios locais de uma vez.`,
    );
  });

  test("[VULN] imageUrl aceita javascript:, data:, file: e hosts internos", () => {
    const { listingSchema, postSchema } = h.load("lib/validations/listing.ts");
    const bad = [
      "javascript:alert(document.cookie)",
      "data:image/svg+xml,<svg onload=alert(1)>",
      "file:///etc/passwd",
      "http://169.254.169.254/latest/meta-data/",
      "http://localhost:3000/api/health",
      "http://10.0.0.5/admin",
    ];
    const base = { title: "t", price: 1, category: "MARKET", available: true };
    const accepted = [];
    for (const url of bad) {
      if (listingSchema.safeParse({ ...base, imageUrl: url }).success) accepted.push(`listing: ${url}`);
      if (postSchema.safeParse({ text: "x", imageUrl: url }).success) accepted.push(`post: ${url}`);
    }
    assert.deepEqual(accepted, [], `URLs perigosas aceitas: \n  ${accepted.join("\n  ")}`);
  });

  test("[VULN] foto de perfil (account.updateProfile) aceita javascript:/data:/hosts internos", async () => {
    const accepted = [];
    for (const url of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "http://127.0.0.1:5432/"]) {
      const { mod, db } = loadUserAction("server/actions/account.ts");
      const r = await mod.updateProfile(h.formData({ name: "N", image: url }));
      if (r.ok && db.calls.some((c) => c.key === "user.update")) accepted.push(url);
    }
    assert.deepEqual(accepted, [], `updateProfile gravou image = ${accepted.join(", ")}`);
  });

  test("[VULN] preço sem teto estoura Decimal(10,2) e derruba a action", () => {
    const { listingSchema } = h.load("lib/validations/listing.ts");
    const r = listingSchema.safeParse({ title: "t", price: 1e12, category: "MARKET", available: true });
    assert.equal(r.success, false, "listingSchema aceita price = 1e12; a coluna é Decimal(10,2) (máx. 99.999.999,99) -> erro 500.");
  });

  test("[VULN] toggleFavorite com vendedor inexistente lança erro não tratado", async () => {
    const { mod } = loadUserAction("server/actions/favorites.ts", {
      handlers: {
        "favorite.create": () => {
          throw Object.assign(new Error("Foreign key constraint failed"), { code: "P2003" });
        },
      },
    });
    const r = await mod.toggleFavorite("nao-existe").catch((e) => ({ threw: e.message }));
    assert.ok(!r.threw, `toggleFavorite não valida sellerId e propaga o erro do Prisma: ${r.threw}`);
  });

  test("[OK] changePassword exige a senha atual e trata conta Google (sem senha)", async () => {
    const hash = bcrypt.hashSync("senha-atual-123", 4);
    const fd = h.formData({ currentPassword: "errada", newPassword: "nova-senha-123", confirmPassword: "nova-senha-123" });
    {
      const { mod, db } = loadUserAction("server/actions/account.ts", { handlers: { "user.findUnique": () => ({ id: "user-A", password: hash }) } });
      assert.equal((await mod.changePassword(fd)).ok, false);
      assert.equal(writes(db).length, 0);
    }
    {
      const { mod, db } = loadUserAction("server/actions/account.ts", { handlers: { "user.findUnique": () => ({ id: "user-A", password: null }) } });
      assert.equal((await mod.changePassword(fd)).ok, false);
      assert.equal(writes(db).length, 0);
    }
  });

  test("[VULN] deleteAccount apaga a conta sem reautenticação", async () => {
    const hash = bcrypt.hashSync("senha-atual-123", 4);
    const { mod, db } = loadUserAction("server/actions/account.ts", {
      handlers: { "user.findUnique": () => ({ id: "user-A", password: hash }) },
    });
    const result = await mod.deleteAccount();
    const deleted = db.calls.some((c) => c.key === "user.delete");
    assert.ok(
      !deleted,
      `deleteAccount() sem nenhum argumento apagou o usuário (ok=${result.ok}). Exclusão irreversível em cascata ` +
        `(perfil, produtos, posts, favoritos) só com o cookie de sessão: sem senha atual nem confirmação no servidor.`,
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Queries, /api/health e src/lib/prisma.ts — vazamento de dados / fallback
// ---------------------------------------------------------------------------
describe("queries, health e prisma", () => {
  test("[OK] getSellerProfile não expõe userId, e-mail ou hash mesmo se o banco devolver", async () => {
    const db = h.fakePrisma({
      "sellerProfile.findUnique": () => ({
        id: "s1", userId: "u1", displayName: "D", description: null, category: "MARKET", phone: null, address: null,
        latitude: null, longitude: null, openingHours: null, isVerified: false,
        user: { email: "dono@x.com", password: "$2b$12$hash" },
        listings: [{ id: "l1", sellerId: "s1", title: "t", description: null, price: 1, imageUrl: null, category: "MARKET", available: true }],
        posts: [], locations: [],
      }),
    });
    const { getSellerProfile } = h.load("server/queries/sellerProfile.ts", { mocks: { "@/lib/prisma": { prisma: db.client } } });
    const out = JSON.stringify(await getSellerProfile("s1"));
    for (const leak of ["u1", "dono@x.com", "$2b$", "userId", "password", "sellerId"]) {
      assert.ok(!out.includes(leak), `getSellerProfile vazou "${leak}"`);
    }
  });

  test("[OK] getMapSellers usa select sem userId/e-mail", () => {
    const src = h.readSrc("server/queries/sellers.ts");
    const select = src.slice(src.indexOf("select:"));
    assert.doesNotMatch(select, /userId|email|password|user:/);
  });

  test("[OK] getAccountData só lê o usuário da sessão e não devolve o hash", async () => {
    const db = h.fakePrisma({
      "user.findUnique": (a) => ({ id: a.where.id, name: "N", email: "e@x.com", image: null, role: "BUYER", password: "$2b$12$h", sellerProfile: null, favorites: [] }),
    });
    const { getAccountData } = h.load("server/queries/account.ts", {
      mocks: { "@/lib/prisma": { prisma: db.client }, "@/lib/auth": { getSession: async () => h.fakeSession("user-A") } },
    });
    const data = await getAccountData();
    assert.equal(db.calls[0].args.where.id, "user-A");
    assert.ok(!JSON.stringify(data).includes("$2b$"));
  });

  test("[OK] /api/health não vaza detalhes do erro nem configuração", async () => {
    const ok = h.load("app/api/health/route.ts", {
      mocks: { "@/lib/prisma": { prisma: { $queryRaw: async () => 1 }, getDatabaseMode: async () => "neon" } },
    });
    const body = await (await ok.GET()).json();
    // Só status (e databaseMode fora de produção) — nada de serviço, host ou configuração.
    for (const key of Object.keys(body)) {
      assert.ok(["status", "databaseMode"].includes(key), `/api/health expõe o campo "${key}"`);
    }
    assert.equal(body.status, "ok");

    const bad = h.load("app/api/health/route.ts", {
      mocks: {
        "@/lib/prisma": {
          prisma: { $queryRaw: async () => { throw new Error("postgres://user:SENHA@host/db"); } },
          getDatabaseMode: async () => "neon",
        },
      },
    });
    const res = await bad.GET();
    assert.equal(res.status, 503);
    assert.ok(!(await res.text()).includes("SENHA"));
  });

  test("[OK] fallback SQLite não liga em produção, nem com DB_FALLBACK=force", async () => {
    const env = { NODE_ENV: "production", DB_FALLBACK: "force", DATABASE_URL: "postgresql://u:p@127.0.0.1:1/db" };
    const mod = h.load("lib/prisma.ts", { env });
    assert.equal(await mod.getDatabaseMode(), "neon");
    // O cliente "deferred" (dev) é um Proxy sobre function(){}; o PrismaClient real é um objeto.
    assert.equal(typeof mod.prisma, "object", "em produção deve ser o PrismaClient Postgres direto, sem proxy de fallback");
    assert.equal(typeof mod.prisma.$connect, "function");
    await mod.prisma.$disconnect().catch(() => {});
  });
});
