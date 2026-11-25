// Harness dos testes de segurança (frente A — backend/auth).
//
// Carrega os arquivos .ts REAIS de src/ dentro do Node, sem build e sem
// dependências novas: cada .ts é transpilado na hora com o `typescript` que já
// está em devDependencies (ts.transpileModule -> CommonJS). O alias `@/` do
// tsconfig é resolvido para src/. Módulos com efeito externo (Prisma, sessão,
// next/cache) podem ser trocados por mocks, para exercitar a lógica das
// server actions / route handlers sem banco e sem `next dev`.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..", "..");
const SRC = path.join(ROOT, "src");

const mocks = new Map(); // specifier -> exports
const MOCK_PREFIX = "\0mock:";

function resolveAlias(request) {
  const base = path.join(SRC, request.slice(2));
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), `${base}.js`, path.join(base, "index.js")];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`[harness] não resolvi ${request}`);
}

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, ...rest) {
  if (mocks.has(request)) return MOCK_PREFIX + request;
  if (request.startsWith("@/")) return resolveAlias(request);
  // imports relativos sem extensão entre arquivos .ts
  if ((request.startsWith("./") || request.startsWith("../")) && parent?.filename?.startsWith(SRC)) {
    const abs = path.resolve(path.dirname(parent.filename), request);
    for (const candidate of [`${abs}.ts`, `${abs}.tsx`, path.join(abs, "index.ts")]) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return originalResolve.call(this, request, parent, ...rest);
};

function transpile(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  module._compile(outputText, filename);
}
require.extensions[".ts"] = transpile;
require.extensions[".tsx"] = transpile;

function clearCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(SRC) || key.startsWith(MOCK_PREFIX)) delete require.cache[key];
  }
}

/**
 * Carrega um arquivo de src/ do zero (cache limpo), com mocks e env opcionais.
 * @param {string} rel caminho relativo a src/, ex.: "server/actions/locations.ts"
 * @param {{ mocks?: Record<string, unknown>, env?: Record<string, string|undefined> }} [options]
 */
function load(rel, options = {}) {
  clearCache();
  mocks.clear();
  for (const [specifier, exports] of Object.entries(options.mocks ?? {})) {
    mocks.set(specifier, exports);
    const id = MOCK_PREFIX + specifier;
    const mod = new Module(id);
    mod.filename = id;
    mod.loaded = true;
    mod.exports = exports;
    require.cache[id] = mod;
  }
  const previousEnv = {};
  for (const [key, value] of Object.entries(options.env ?? {})) {
    previousEnv[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return require(path.join(SRC, rel));
  } finally {
    // As constantes de módulo já foram avaliadas; restaura o env do processo.
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

/**
 * Prisma falso que registra cada chamada `prisma.<model>.<method>(args)`.
 * `handlers["model.method"]` define o retorno; sem handler devolve `defaults`.
 */
function fakePrisma(handlers = {}) {
  const calls = [];
  const defaults = {
    findUnique: null,
    findFirst: null,
    findMany: [],
    count: 0,
    updateMany: { count: 1 },
    deleteMany: { count: 1 },
  };
  const client = new Proxy(
    {},
    {
      get(_t, model) {
        if (model === "then") return undefined;
        if (model === "$transaction") {
          return async (fn) => (typeof fn === "function" ? fn(client) : Promise.all(fn));
        }
        return new Proxy(
          {},
          {
            get(_t2, method) {
              return async (args) => {
                const key = `${String(model)}.${String(method)}`;
                calls.push({ key, args });
                if (handlers[key]) return handlers[key](args);
                if (method in defaults) return defaults[method];
                return { id: "created-id", ...(args?.data ?? {}) };
              };
            },
          },
        );
      },
    },
  );
  return { client, calls };
}

function fakeSession(userId) {
  return userId ? { user: { id: userId, role: "SELLER", email: "x@x.com" }, expires: "2999-01-01" } : null;
}

function formData(entries) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) value.forEach((v) => fd.append(key, String(v)));
    else fd.append(key, String(value));
  }
  return fd;
}

function readSrc(rel) {
  return fs.readFileSync(path.join(SRC, rel), "utf8");
}

function listSrc(relDir) {
  return fs
    .readdirSync(path.join(SRC, relDir))
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.posix.join(relDir, f));
}

module.exports = { ROOT, SRC, load, fakePrisma, fakeSession, formData, readSrc, listSrc };
