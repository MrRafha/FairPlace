import { z } from "zod";

import { LISTING_CATEGORIES } from "@/lib/constants";
import { emailField, passwordField } from "@/lib/validations/common";

const categoryValues = LISTING_CATEGORIES.map((category) => category.value) as [string, ...string[]];

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Informe seu nome.").max(120, "Nome muito longo."),
    email: emailField,
    password: passwordField,
    passwordConfirmation: z.string().max(200),
    role: z.enum(["buyer", "seller"]),
    product: z.string().trim().max(600, "Descreva em até 600 caracteres.").optional(),
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
