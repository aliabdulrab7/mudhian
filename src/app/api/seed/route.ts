import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/seed — creates admin account (run once)
export async function GET() {
  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (existing) {
    return NextResponse.json({ message: "Admin already exists" });
  }

  const hashed = bcrypt.hashSync("admin123", 10);
  await prisma.user.create({
    data: {
      username: "admin",
      password: hashed,
      role: "admin",
    },
  });

  return NextResponse.json({ ok: true, message: "Admin created: username=admin, password=admin123" });
}
