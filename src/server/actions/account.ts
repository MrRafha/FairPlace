"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ActionResult } from "@/server/actions/listings";

const SALT_ROUNDS = 12;

const profileSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome.").max(120),
  image: z.string().trim().url("Informe uma URL de imagem válida.").optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(8, "A nova senha deve ter no mínimo 8 caracteres."),
    confirmPassword: z.string(),
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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password) {
    return { ok: false, error: "Sua conta não usa senha (login via Google)." };
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) {
    return { ok: false, error: "Senha atual incorreta." };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { password: newHash } });

  return { ok: true };
}

export async function deleteAccount(): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  // onDelete: Cascade cuida de SellerProfile, listings, posts e favoritos.
  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
