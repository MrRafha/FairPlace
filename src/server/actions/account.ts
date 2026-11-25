"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ActionResult } from "@/server/actions/listings";
import { optionalImageUrl, passwordField } from "@/lib/validations/common";
import { rateLimit } from "@/lib/rateLimit";

const SALT_ROUNDS = 12;

const profileSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome.").max(120),
  image: optionalImageUrl,
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual.").max(200),
    newPassword: passwordField,
    confirmPassword: z.string().max(200),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

async function requireUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    image: formData.get("image") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name, image: parsed.data.image || null },
  });

  revalidatePath("/conta");
  return { ok: true };
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Limita tentativas de adivinhar a senha atual com uma sessão roubada.
  if (rateLimit(`password:user:${userId}`, 5, 15 * 60 * 1000).limited) {
    return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password) {
    return { ok: false, error: "Sua conta não usa senha (login via Google)." };
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) {
    return { ok: false, error: "Senha atual incorreta." };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, SALT_ROUNDS);
  // passwordChangedAt invalida todas as sessões abertas antes da troca
  // (inclusive a atual: o cliente leva o usuário a entrar de novo).
  await prisma.user.update({ where: { id: userId }, data: { password: newHash, passwordChangedAt: new Date() } });

  return { ok: true };
}

// Exclusão irreversível: exige reautenticação no servidor (senha atual ou,
// para conta Google sem senha, o próprio e-mail) — não basta o cookie de sessão.
export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }
  if (!(formData instanceof FormData)) {
    return { ok: false, error: "Confirme sua identidade para excluir a conta." };
  }
  if (rateLimit(`delete:user:${userId}`, 5, 15 * 60 * 1000).limited) {
    return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { ok: false, error: "Conta não encontrada." };
  }

  if (user.password) {
    const currentPassword = formData.get("currentPassword");
    if (typeof currentPassword !== "string" || currentPassword.length === 0 || currentPassword.length > 200 ||
        !(await bcrypt.compare(currentPassword, user.password))) {
      return { ok: false, error: "Senha incorreta." };
    }
  } else {
    const confirmEmail = formData.get("confirmEmail");
    if (typeof confirmEmail !== "string" || !user.email || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      return { ok: false, error: "Digite o e-mail da sua conta para confirmar." };
    }
  }

  // onDelete: Cascade cuida de SellerProfile, listings, posts e favoritos.
  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
