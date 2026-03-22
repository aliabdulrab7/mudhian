import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readFileSync } from "fs";
import path from "path";

// GET /api/backup — download SQLite DB file (admin only)
export async function GET() {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  const file = readFileSync(dbPath);

  const now = new Date().toISOString().slice(0, 10);
  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="mudhian-backup-${now}.db"`,
    },
  });
}
