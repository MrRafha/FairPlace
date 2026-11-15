import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { verifyTurnstileToken } from "@/lib/turnstile";
import type { ListingCategoryValue } from "@/lib/constants";

const SALT_ROUNDS = 12;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
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

  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    return NextResponse.json({ message: "Este e-mail já está cadastrado." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

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

  return NextResponse.json({ message: "Cadastro concluído com sucesso." }, { status: 201 });
}
