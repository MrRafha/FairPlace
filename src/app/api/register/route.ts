import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { verifyTurnstileToken } from "@/lib/turnstile";
import type { ListingCategoryValue } from "@/lib/constants";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const SALT_ROUNDS = 12;
const MAX_BODY_BYTES = 16 * 1024; // um cadastro real tem ~1 KB
const REGISTER_MAX_PER_IP = 10;
const REGISTER_WINDOW_MS = 60 * 60 * 1000; // 1 h

// Mesma resposta para e-mail novo e e-mail já cadastrado (evita enumeração).
const DONE_MESSAGE = "Cadastro recebido. Se o e-mail já tinha conta, entre com a senha cadastrada.";

class BodyTooLargeError extends Error {}

/** Lê o corpo com teto de bytes, sem carregar uploads gigantes na memória. */
async function readJsonLimited(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new BodyTooLargeError();
  if (!request.body) return JSON.parse("");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Origem do próprio site (NEXTAUTH_URL); null se não configurada. */
function siteOrigin(): string | null {
  try {
    return process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // CSRF: um <form enctype="text/plain"> de outro site manda JSON válido sem
  // preflight. Exigir application/json força o preflight CORS (que falha), e a
  // Origin, quando enviada, precisa ser a do próprio site.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ message: "Content-Type inválido." }, { status: 415 });
  }
  const origin = request.headers.get("origin");
  const expectedOrigin = siteOrigin();
  if (origin && expectedOrigin && origin !== expectedOrigin) {
    return NextResponse.json({ message: "Origem não permitida." }, { status: 403 });
  }

  if (rateLimit(`register:ip:${clientIp(request.headers)}`, REGISTER_MAX_PER_IP, REGISTER_WINDOW_MS).limited) {
    return NextResponse.json({ message: "Muitas tentativas. Tente de novo mais tarde." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await readJsonLimited(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json({ message: "Requisição muito grande." }, { status: 413 });
    }
    return NextResponse.json({ message: "Corpo da requisição inválido." }, { status: 400 });
  }

  const turnstileToken =
    body && typeof body === "object" && "turnstileToken" in body
      ? (body as { turnstileToken?: string }).turnstileToken
      : undefined;

  const isHuman = await verifyTurnstileToken(turnstileToken);
  if (!isHuman) {
    return NextResponse.json(
      { message: "Falha na verificação de segurança. Confirme o CAPTCHA e tente novamente." },
      { status: 400 },
    );
  }

  let data;
  try {
    data = registerSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  // O hash roda antes da checagem para o tempo de resposta ser igual nos dois casos.
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    // Não revela que o e-mail existe: mesma resposta do cadastro novo.
    return NextResponse.json({ message: DONE_MESSAGE }, { status: 201 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: passwordHash,
          role: data.role === "seller" ? "SELLER" : "BUYER",
        },
      });

      if (data.role === "seller" && data.product && data.category) {
        await tx.sellerProfile.create({
          data: {
            userId: user.id,
            displayName: data.name,
            description: data.product,
            category: data.category as ListingCategoryValue,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
          },
        });
      }
    });
  } catch {
    return NextResponse.json(
      { message: "Não foi possível concluir o cadastro. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: DONE_MESSAGE }, { status: 201 });
}
