import { NextResponse } from "next/server";

import { getDatabaseMode, prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      service: "fairplace-api",
      database: "connected",
      databaseMode: await getDatabaseMode(),
    });
  } catch {
    return NextResponse.json(
      { status: "error", service: "fairplace-api", database: "unavailable" },
      { status: 503 },
    );
  }
}
