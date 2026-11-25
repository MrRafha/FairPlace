"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseId } from "@/lib/validations/common";

export type FavoriteResult = { ok: boolean; favorited?: boolean; error?: string };

// Alterna o favorito de um vendedor para o usuário autenticado.
// Respeita a regra de negócio: um usuário não pode favoritar o mesmo vendedor
// duas vezes (constraint @@unique no banco + checagem aqui).
export async function toggleFavorite(rawSellerId: unknown): Promise<FavoriteResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "Faça login para favoritar vendedores." };
  }

  const userId = session.user.id;
  const sellerId = parseId(rawSellerId);
  if (!sellerId) {
    return { ok: false, error: "Vendedor não encontrado." };
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_sellerId: { userId, sellerId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    revalidatePath(`/vendedor/${sellerId}`);
    return { ok: true, favorited: false };
  }

  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId }, select: { id: true, userId: true } });
  if (!seller) {
    return { ok: false, error: "Vendedor não encontrado." };
  }
  if (seller.userId === userId) {
    return { ok: false, error: "Você não pode favoritar a sua própria vitrine." };
  }

  try {
    await prisma.favorite.create({ data: { userId, sellerId } });
  } catch {
    // Corrida (clique duplo) ou vendedor apagado no meio do caminho.
    return { ok: false, error: "Não foi possível favoritar agora. Tente de novo." };
  }
  revalidatePath(`/vendedor/${sellerId}`);
  return { ok: true, favorited: true };
}

export async function isFavorited(rawSellerId: unknown): Promise<boolean> {
  const session = await getSession();
  const sellerId = parseId(rawSellerId);
  if (!session?.user?.id || !sellerId) {
    return false;
  }
  const existing = await prisma.favorite.findUnique({
    where: { userId_sellerId: { userId: session.user.id, sellerId } },
  });
  return Boolean(existing);
}
