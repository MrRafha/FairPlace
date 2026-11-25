import { NextResponse } from "next/server";

import { getDatabaseMode, prisma } from "@/lib/prisma";

// Público e sem cache: em produção responde só ok/erro, sem revelar o
// fornecedor nem o modo do banco. O detalhe (neon/sqlite) só aparece em dev.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await prisma.$queryRaw`SELECT 1`;
    const body =
      process.env.NODE_ENV === "production"
        ? { status: "ok" }
        : { status: "ok", databaseMode: await getDatabaseMode() };
    return NextResponse.json(body, { headers });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503, headers });
  }
}
