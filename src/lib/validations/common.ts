import { z } from "zod";

// Validadores compartilhados de segurança (ver tests/security/backend.test.mjs).

/**
 * Id vindo do cliente. Server actions recebem argumentos serializados pelo
 * React: sem isso, um objeto como `{ not: "" }` chegaria ao `where` do Prisma
 * (injeção de operador em updateMany/deleteMany).
 */
export const idSchema = z.string().min(1).max(64);

export function parseId(value: unknown): string | null {
  const parsed = idSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** E-mail normalizado: sem espaços e em minúsculas (evita contas duplicadas por caixa). */
export const emailField = z.string().trim().toLowerCase().max(254).email("Informe um e-mail válido.");

export function normalizeEmail(value: unknown): string | null {
  const parsed = emailField.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// Senhas comuns demais para serem aceitas (lista curta; o mínimo de 10 já corta a maioria).
const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "0123456789", "password", "password1", "senha123", "senha1234",
  "qwerty123", "qwertyuiop", "abcdefgh", "abc12345", "11111111", "iloveyou", "admin123", "fairplace",
]);

/**
 * Política de senha: 10+ caracteres, no máximo 72 bytes (o bcrypt ignora o
 * que passar disso), não pode ser uma senha comum nem repetir poucos caracteres.
 */
export const passwordField = z
  .string()
  .min(10, "A senha deve ter no mínimo 10 caracteres.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "A senha deve ter no máximo 72 caracteres.")
  .refine(
    (value) => !COMMON_PASSWORDS.has(value.toLowerCase()) && new Set(value).size >= 4,
    "Essa senha é fácil demais de adivinhar. Misture letras, números e símbolos.",
  );

const PRIVATE_HOST =
  /^(localhost|.*\.localhost|.*\.local|.*\.internal|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|0\.\d+\.\d+\.\d+|\[.*\])$/i;

/**
 * URL de imagem informada pelo usuário: só https, host público com domínio
 * (bloqueia javascript:, data:, file:, IPs internos e metadata de nuvem).
 */
export const safeImageUrl = z
  .string()
  .trim()
  .max(2048, "URL muito longa.")
  .refine((value) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname;
    return host.includes(".") && !PRIVATE_HOST.test(host) && !/^\d+\.\d+\.\d+\.\d+$/.test(host);
  }, "Use um link https público para a imagem.");

/** Campo de imagem opcional (string vazia = sem imagem). */
export const optionalImageUrl = safeImageUrl.optional().or(z.literal(""));
