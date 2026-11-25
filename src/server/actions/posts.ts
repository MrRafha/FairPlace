"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { postSchema } from "@/lib/validations/listing";
import { getCurrentSellerProfile } from "@/server/actions/sellerContext";
import { parseId } from "@/lib/validations/common";
import type { ActionResult } from "@/server/actions/listings";

function parsePost(formData: FormData) {
  return postSchema.safeParse({
    text: formData.get("text"),
    imageUrl: formData.get("imageUrl") || "",
  });
}

export async function createPost(formData: FormData): Promise<ActionResult> {
  const seller = await getCurrentSellerProfile();
  if (!seller) {
    return { ok: false, error: "Você precisa de um perfil de vendedor para publicar." };
  }

  const parsed = parsePost(formData);
  if (!parsed.success) {
    return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.sellerPost.create({
    data: {
      sellerId: seller.id,
      text: parsed.data.text,
      imageUrl: parsed.data.imageUrl || null,
    },
  });

  revalidatePath("/vendedor/painel");
  revalidatePath(`/vendedor/${seller.id}`);
  return { ok: true };
}

export async function updatePost(rawPostId: unknown, formData: FormData): Promise<ActionResult> {
  const seller = await getCurrentSellerProfile();
  if (!seller) {
    return { ok: false, error: "Sem permissão." };
  }

  const postId = parseId(rawPostId);
  if (!postId) {
    return { ok: false, error: "Publicação não encontrada ou sem permissão." };
  }

  const post = await prisma.sellerPost.findUnique({ where: { id: postId } });
  if (!post || post.sellerId !== seller.id) {
    return { ok: false, error: "Publicação não encontrada ou sem permissão." };
  }

  const parsed = parsePost(formData);
  if (!parsed.success) {
    return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.sellerPost.update({
    where: { id: postId },
    data: { text: parsed.data.text, imageUrl: parsed.data.imageUrl || null },
  });

  revalidatePath("/vendedor/painel");
  revalidatePath(`/vendedor/${seller.id}`);
  return { ok: true };
}

export async function deletePost(rawPostId: unknown): Promise<ActionResult> {
  const seller = await getCurrentSellerProfile();
  if (!seller) {
    return { ok: false, error: "Sem permissão." };
  }

  const postId = parseId(rawPostId);
  if (!postId) {
    return { ok: false, error: "Publicação não encontrada ou sem permissão." };
  }

  const post = await prisma.sellerPost.findUnique({ where: { id: postId } });
  if (!post || post.sellerId !== seller.id) {
    return { ok: false, error: "Publicação não encontrada ou sem permissão." };
  }

  await prisma.sellerPost.delete({ where: { id: postId } });

  revalidatePath("/vendedor/painel");
  revalidatePath(`/vendedor/${seller.id}`);
  return { ok: true };
}
