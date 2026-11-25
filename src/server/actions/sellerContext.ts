
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Retorna o SellerProfile do usuário autenticado, ou null se não houver sessão
// ou o usuário não tiver perfil de vendedor. Usado pelas actions do painel para
// garantir que só o dono manipula seus próprios produtos/publicações.
export async function getCurrentSellerProfile() {
  const session = await getSession();
  if (!session?.user?.id) {
    return null;
  }
  return prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
  });
}
