import { z } from "zod";

import { LISTING_CATEGORIES } from "@/lib/constants";
import { optionalImageUrl } from "@/lib/validations/common";

const categoryValues = LISTING_CATEGORIES.map((category) => category.value) as [string, ...string[]];

export const listingSchema = z.object({
  title: z.string().trim().min(1, "Informe o nome do produto.").max(120),
  description: z.string().trim().max(600).optional(),
  // Coluna Decimal(10,2): máximo 99.999.999,99.
  price: z.number().min(0, "O preço não pode ser negativo.").max(99_999_999.99, "Preço alto demais."),
  category: z.enum(categoryValues),
  imageUrl: optionalImageUrl,
  available: z.boolean().default(true),
});

export type ListingInput = z.infer<typeof listingSchema>;

export const postSchema = z.object({
  text: z.string().trim().min(1, "Escreva algo para publicar.").max(1000),
  imageUrl: optionalImageUrl,
});

export type PostInput = z.infer<typeof postSchema>;
