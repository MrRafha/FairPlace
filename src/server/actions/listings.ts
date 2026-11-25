"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { listingSchema } from "@/lib/validations/listing";
import { getCurrentSellerProfile } from "@/server/actions/sellerContext";
import type { ListingCategoryValue } from "@/lib/constants";
import { parseId } from "@/lib/validations/common";

export type ActionResult = { ok: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> };

function parseListing(formData: FormData) {
  const priceRaw = formData.get("price");
  return listingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    price: priceRaw ? Number(priceRaw) : NaN,
    category: formData.get("category"),
    imageUrl: formData.get("imageUrl") || "",
    available: formData.get("available") === "on" || formData.get("available") === "true",
  });
}

export async function createListing(formData: FormData): Promise<ActionResult> {
  const seller = await getCurrentSellerProfile();
  if (!seller) {
    return { ok: false, error: "Você precisa de um perfil de vendedor para cadastrar produtos." };
  }

  const parsed = parseListing(formData);
  if (!parsed.success) {
    return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.listing.create({
    data: {
      sellerId: seller.id,
      title: parsed.data.title,
      description: parsed.data.description,
      price: parsed.data.price,
      category: parsed.data.category as ListingCategoryValue,
      imageUrl: parsed.data.imageUrl || null,
      available: parsed.data.available,
    },
  });

  revalidatePath("/vendedor/painel");
  revalidatePath(`/vendedor/${seller.id}`);
  return { ok: true };
}

export async function updateListing(rawListingId: unknown, formData: FormData): Promise<ActionResult> {
  const seller = await getCurrentSellerProfile();
  if (!seller) {
    return { ok: false, error: "Sem permissão." };
  }

  const listingId = parseId(rawListingId);
  if (!listingId) {
    return { ok: false, error: "Produto não encontrado ou sem permissão." };
  }

  // Garante que o produto pertence ao vendedor autenticado.
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== seller.id) {
    return { ok: false, error: "Produto não encontrado ou sem permissão." };
  }

  const parsed = parseListing(formData);
  if (!parsed.success) {
    return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      price: parsed.data.price,
      category: parsed.data.category as ListingCategoryValue,
      imageUrl: parsed.data.imageUrl || null,
      available: parsed.data.available,
    },
  });

  revalidatePath("/vendedor/painel");
  revalidatePath(`/vendedor/${seller.id}`);
  return { ok: true };
}

export async function deleteListing(rawListingId: unknown): Promise<ActionResult> {
  const seller = await getCurrentSellerProfile();
  if (!seller) {
    return { ok: false, error: "Sem permissão." };
  }

  const listingId = parseId(rawListingId);
  if (!listingId) {
    return { ok: false, error: "Produto não encontrado ou sem permissão." };
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== seller.id) {
    return { ok: false, error: "Produto não encontrado ou sem permissão." };
  }

  await prisma.listing.delete({ where: { id: listingId } });

  revalidatePath("/vendedor/painel");
  revalidatePath(`/vendedor/${seller.id}`);
  return { ok: true };
}

export async function setListingAvailability(rawListingId: unknown, available: unknown): Promise<ActionResult> {
  const seller = await getCurrentSellerProfile();
  if (!seller) {
    return { ok: false, error: "Sem permissão." };
  }

  const listingId = parseId(rawListingId);
  if (!listingId) {
    return { ok: false, error: "Produto não encontrado ou sem permissão." };
  }
  if (typeof available !== "boolean") {
    return { ok: false, error: "Valor inválido." };
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== seller.id) {
    return { ok: false, error: "Produto não encontrado ou sem permissão." };
  }

  await prisma.listing.update({ where: { id: listingId }, data: { available } });

  revalidatePath("/vendedor/painel");
  revalidatePath(`/vendedor/${seller.id}`);
  return { ok: true };
}
