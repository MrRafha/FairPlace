import { z } from "zod";

import { LISTING_CATEGORIES } from "@/lib/constants";

const categoryValues = LISTING_CATEGORIES.map((category) => category.value) as [string, ...string[]];

export const listingSchema = z.object({
  title: z.string().trim().min(1, "Informe o nome do produto.").max(120),
  description: z.string().trim().max(600).optional(),
  price: z.number().min(0, "O preço não pode ser negativo."),
  category: z.enum(categoryValues),
  imageUrl: z.string().trim().url("Informe uma URL de imagem válida.").optional().or(z.literal("")),
  available: z.boolean().default(true),
});

export type ListingInput = z.infer<typeof listingSchema>;

export const postSchema = z.object({
  text: z.string().trim().min(1, "Escreva algo para publicar.").max(1000),
  imageUrl: z.string().trim().url("Informe uma URL de imagem válida.").optional().or(z.literal("")),
});

export type PostInput = z.infer<typeof postSchema>;
