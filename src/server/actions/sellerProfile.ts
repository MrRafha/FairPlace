"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentSellerProfile } from "@/server/actions/sellerContext";
import { LISTING_CATEGORIES, type ListingCategoryValue } from "@/lib/constants";
import type { ActionResult } from "@/server/actions/listings";

const categoryValues = LISTING_CATEGORIES.map((category) => category.value) as [string, ...string[]];

const sellerProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Informe o nome da sua vitrine.").max(120),
  description: z.string().trim().max(600).optional(),
  category: z.enum(categoryValues),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(200).optional(),
  openingHours: z.string().trim().max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export async function updateSellerProfile(formData: FormData): Promise<ActionResult> {
  const seller = await getCurrentSellerProfile();
  if (!seller) {
    return { ok: false, error: "Você não possui um perfil de vendedor." };
  }

  const latRaw = formData.get("latitude");
  const lngRaw = formData.get("longitude");

  const parsed = sellerProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    description: formData.get("description") || undefined,
    category: formData.get("category"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    openingHours: formData.get("openingHours") || undefined,
    latitude: latRaw ? Number(latRaw) : undefined,
    longitude: lngRaw ? Number(lngRaw) : undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.sellerProfile.update({
    where: { id: seller.id },
    data: {
      displayName: parsed.data.displayName,
      description: parsed.data.description,
      category: parsed.data.category as ListingCategoryValue,
      phone: parsed.data.phone,
      address: parsed.data.address,
      openingHours: parsed.data.openingHours,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
  });

  revalidatePath("/vendedor/painel");
  revalidatePath(`/vendedor/${seller.id}`);
  return { ok: true };
}
