"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentSellerProfile } from "@/server/actions/sellerContext";
import type { ActionResult } from "@/server/actions/listings";

const MAX_LOCATIONS = 10;

const locationSchema = z.object({
  label: z.string().trim().min(1, "Dê um nome ao local (ex.: Feira do Centro).").max(80),
  address: z.string().trim().max(200).optional(),
  latitude: z.number({ message: "Marque o local no mapa ou use sua localização." }).min(-90).max(90),
  longitude: z.number({ message: "Marque o local no mapa ou use sua localização." }).min(-180).max(180),
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Escolha pelo menos um dia da semana.")
    .transform((days) => [...new Set(days)].sort()),
});

function parseLocation(formData: FormData) {
  const lat = formData.get("latitude");
  const lng = formData.get("longitude");
  return locationSchema.safeParse({
    label: formData.get("label"),
    address: formData.get("address") || undefined,
    latitude: lat ? Number(lat) : undefined,
    longitude: lng ? Number(lng) : undefined,
    weekdays: formData.getAll("weekdays").map(Number),
  });
}

function revalidateSeller(sellerId: string) {
  revalidatePath("/vendedor/painel");
  revalidatePath(`/vendedor/${sellerId}`);
  revalidatePath("/mapa");
}

export async function createLocation(formData: FormData): Promise<ActionResult> {
  const seller = await getCurrentSellerProfile();
  if (!seller) return { ok: false, error: "Você precisa de um perfil de vendedor." };

  const parsed = parseLocation(formData);
  if (!parsed.success) {
    return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const count = await prisma.sellerLocation.count({ where: { sellerId: seller.id } });
  if (count >= MAX_LOCATIONS) {
    return { ok: false, error: `Limite de ${MAX_LOCATIONS} locais atingido.` };
  }

  await prisma.sellerLocation.create({ data: { sellerId: seller.id, ...parsed.data } });
  revalidateSeller(seller.id);
  return { ok: true };
}

export async function updateLocation(id: string, formData: FormData): Promise<ActionResult> {
  const seller = await getCurrentSellerProfile();
  if (!seller) return { ok: false, error: "Você precisa de um perfil de vendedor." };

  const parsed = parseLocation(formData);
  if (!parsed.success) {
    return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // updateMany com sellerId garante que só o dono altera o local.
  const result = await prisma.sellerLocation.updateMany({ where: { id, sellerId: seller.id }, data: parsed.data });
  if (result.count === 0) return { ok: false, error: "Local não encontrado." };

  revalidateSeller(seller.id);
  return { ok: true };
}

export async function deleteLocation(id: string): Promise<ActionResult> {
  const seller = await getCurrentSellerProfile();
  if (!seller) return { ok: false, error: "Você precisa de um perfil de vendedor." };

  const result = await prisma.sellerLocation.deleteMany({ where: { id, sellerId: seller.id } });
  if (result.count === 0) return { ok: false, error: "Local não encontrado." };

  revalidateSeller(seller.id);
  return { ok: true };
}
