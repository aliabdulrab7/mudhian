import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import bcrypt from "bcryptjs";

// GET /api/viewers — list all viewer accounts
export async function GET() {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const viewers = await prisma.user.findMany({
    where: { role: "viewer" },
    select: { id: true, username: true, createdAt: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(viewers);
}

// POST /api/viewers — create viewer account
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { username, password } = await req.json();
  if (!username || !password) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return NextResponse.json({ error: "اسم المستخدم مستخدم بالفعل" }, { status: 400 });

  const hashed = bcrypt.hashSync(password, 10);
  const viewer = await prisma.user.create({
    data: { username, password: hashed, role: "viewer" },
  });

  await logAction(session!, "إضافة مراقب", `مستخدم: ${username}`);
  return NextResponse.json(viewer, { status: 201 });
}
