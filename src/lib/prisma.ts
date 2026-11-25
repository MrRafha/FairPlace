import { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Cliente Prisma com fallback automático para SQLite (APENAS em dev).
//
// Em produção: cliente Postgres (Neon) direto, sem nenhuma verificação.
// Em dev: na primeira query, testa o Neon (`SELECT 1`, com retry por causa
// do cold start). Se não responder, passa a usar prisma/sqlite/dev.db até o
// processo reiniciar. Os dados do SQLite são separados dos do Neon.
//
// DB_FALLBACK (no .env):
//   auto  (padrão) testa o Neon e cai para o SQLite se não houver conexão
//   force usa o SQLite direto, sem esperar o teste (você sabe que está offline)
//   off   desliga o fallback (só Neon, como em produção)
// ---------------------------------------------------------------------------

export type DatabaseMode = "neon" | "sqlite";

type DbState = { client: PrismaClient; mode: DatabaseMode };

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDev?: Promise<DbState>;
};

const PROBE_TIMEOUT_MS = 6000;
const PROBE_ATTEMPTS = 2;

function createNeonClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout após ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function isNeonReachable(client: PrismaClient): Promise<boolean> {
  for (let attempt = 1; attempt <= PROBE_ATTEMPTS; attempt++) {
    try {
      await withTimeout(client.$queryRaw`SELECT 1`, PROBE_TIMEOUT_MS);
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message.split("\n").at(-1) : String(error);
      console.warn(`[db] Neon indisponível (tentativa ${attempt}/${PROBE_ATTEMPTS}): ${reason}`);
    }
  }
  return false;
}

async function createSqliteClient(): Promise<PrismaClient> {
  const path = await import("node:path");
  const { existsSync } = await import("node:fs");
  const dbFile = path.join(process.cwd(), "prisma", "sqlite", "dev.db");

  if (!existsSync(dbFile)) {
    throw new Error("[db] Neon indisponível e prisma/sqlite/dev.db não existe. Rode `npm run db:sqlite`.");
  }

  const { PrismaClient: SqlitePrismaClient } = await import("@/generated/sqlite-client");
  const client = new SqlitePrismaClient({
    datasourceUrl: `file:${dbFile.replace(/\\/g, "/")}`,
    log: ["warn", "error"],
  });

  // Os dois clients têm a mesma API (o schema SQLite é gerado do Postgres).
  // Diferenças conhecidas: listas (Int[]) viram Json, sem filtros `has`/`hasSome`.
  return client as unknown as PrismaClient;
}

async function resolveDevDatabase(): Promise<DbState> {
  const mode = (process.env.DB_FALLBACK ?? "auto").toLowerCase();

  if (mode === "force") {
    console.warn("[db] DB_FALLBACK=force — usando SQLite local (prisma/sqlite/dev.db).");
    return { client: await createSqliteClient(), mode: "sqlite" };
  }

  const neon = createNeonClient();
  if (mode === "off" || (await isNeonReachable(neon))) {
    return { client: neon, mode: "neon" };
  }

  await neon.$disconnect().catch(() => {});
  console.warn("[db] Usando SQLite local (prisma/sqlite/dev.db). Os dados NÃO são os do Neon.");
  return { client: await createSqliteClient(), mode: "sqlite" };
}

const fallbackEnabled = process.env.NODE_ENV !== "production";

function getDevDatabase(): Promise<DbState> {
  // Guardado no globalThis para o teste rodar uma vez por processo (sobrevive ao HMR).
  if (!globalForPrisma.prismaDev) {
    globalForPrisma.prismaDev = resolveDevDatabase().catch((error) => {
      globalForPrisma.prismaDev = undefined; // permite tentar de novo na próxima query
      throw error;
    });
  }
  return globalForPrisma.prismaDev;
}

/** Qual banco está em uso. Em produção é sempre "neon". */
export async function getDatabaseMode(): Promise<DatabaseMode> {
  return fallbackEnabled ? (await getDevDatabase()).mode : "neon";
}

// Proxy que adia cada chamada até o banco ser escolhido:
// prisma.user.findMany(...) -> (await getDevDatabase()).client.user.findMany(...)
// Limitação: as chamadas retornam Promise comum, então `$transaction([...])`
// em formato de array não funciona em dev — use a forma com callback.
function createDeferredClient(): PrismaClient {
  const forward = (path: PropertyKey[]) =>
    new Proxy(function () {}, {
      get(_target, prop) {
        if (prop === "then") return undefined; // não é thenable
        return forward([...path, prop]);
      },
      apply(_target, _thisArg, args) {
        return getDevDatabase().then(({ client }) => {
          let owner: unknown = client;
          for (const key of path.slice(0, -1)) owner = (owner as Record<PropertyKey, unknown>)[key];
          const fn = (owner as Record<PropertyKey, (...a: unknown[]) => unknown>)[path.at(-1)!];
          return fn.apply(owner, args);
        });
      },
    });

  return forward([]) as unknown as PrismaClient;
}

export const prisma: PrismaClient = fallbackEnabled
  ? createDeferredClient()
  : (globalForPrisma.prisma ??= createNeonClient());
