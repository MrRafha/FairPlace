import { z } from "zod";

import { LISTING_CATEGORIES } from "@/lib/constants";

const categoryValues = LISTING_CATEGORIES.map((category) => category.value) as [string, ...string[]];

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Informe seu nome."),
    email: z.string().trim().email("Informe um e-mail válido."),
    password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
    passwordConfirmation: z.string(),
    role: z.enum(["buyer", "seller"]),
    product: z.string().trim().optional(),
    category: z.enum(categoryValues).optional(),
    address: z.string().trim().max(200).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  })
  .refine((data) => data.role !== "seller" || !!data.product?.length, {
    message: "Informe o que você vende.",
    path: ["product"],
  })
  .refine((data) => data.role !== "seller" || !!data.category, {
    message: "Selecione uma categoria.",
    path: ["category"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
