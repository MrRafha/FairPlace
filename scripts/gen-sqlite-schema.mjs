// Gera prisma/sqlite/schema.prisma a partir de prisma/schema.prisma (Postgres).
// Usado só pelo fallback de desenvolvimento (src/lib/prisma.ts).
//
// Transformações:
// - datasource: postgresql -> sqlite (arquivo prisma/sqlite/dev.db)
// - generator: client gerado em src/generated/sqlite-client
// - remove atributos nativos do Postgres (@db.Decimal(9, 6), @db.Text...)
// - listas escalares (Int[], String[]...) viram Json — em runtime o array
//   é gravado/lido igual, mas filtros como `has`/`hasSome` não funcionam.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");

let schema = source
  .replace(/datasource\s+db\s*\{[^}]*\}/, 'datasource db {\n  provider = "sqlite"\n  url      = "file:./dev.db"\n}')
  .replace(
    /generator\s+client\s*\{[^}]*\}/,
    'generator client {\n  provider = "prisma-client-js"\n  output   = "../../src/generated/sqlite-client"\n}',
  )
  .replace(/\s*@db\.\w+(\([^)]*\))?/g, "")
  .replace(/\b(String|Int|BigInt|Float|Decimal|Boolean|DateTime)\[\]/g, "Json");

schema = `// ARQUIVO GERADO por scripts/gen-sqlite-schema.mjs — não edite.\n// Edite prisma/schema.prisma e rode \`npm run db:sqlite\`.\n\n${schema}`;

const outDir = join(root, "prisma", "sqlite");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "schema.prisma"), schema);
console.log("prisma/sqlite/schema.prisma gerado.");
