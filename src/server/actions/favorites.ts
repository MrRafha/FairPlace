"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export type FavoriteResult = { ok: boolean; favorited?: boolean; error?: string };

// Alterna o favorito de um vendedor para o usuário autenticado.
// Respeita a regra de negócio: um usuário não pode favoritar o mesmo vendedor
// duas vezes (constraint @@unique no banco + checagem aqui).
export async function toggleFavorite(sellerId: string): Promise<FavoriteResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "Faça login para favoritar vendedores." };
  }

  const userId = session.user.id;

  const existing = await prisma.favorite.findUnique({
    where: { userId_sellerId: { userId, sellerId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    revalidatePath(`/vendedor/${sellerId}`);
    return { ok: true, favorited: false };
  }

  await prisma.favorite.create({ data: { userId, sellerId } });
  revalidatePath(`/vendedor/${sellerId}`);
  return { ok: true, favorited: true };
}

export async function isFavorited(sellerId: string): Promise<boolean> {
  const session = await getSession();
  if (!session?.user?.id) {
    return false;
  }
  const existing = await prisma.favorite.findUnique({
    where: { userId_sellerId: { userId: session.user.id, sellerId } },
  });
  return Boolean(existing);
}
