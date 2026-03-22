import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import bcrypt from "bcryptjs";

// PATCH /api/viewers/[id] — update viewer password
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const { password } = await req.json();

  const data: Record<string, string> = {};
  if (password) data.password = bcrypt.hashSync(password, 10);

  const user = await prisma.user.update({ where: { id: parseInt(id) }, data });
  await logAction(session!, "تعديل مراقب", `مستخدم: ${user.username}`);
  return NextResponse.json({ ok: true });
}

// DELETE /api/viewers/[id] — delete viewer account
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
  await prisma.user.delete({ where: { id: parseInt(id) } });
  await logAction(session!, "حذف مراقب", `مستخدم: ${user?.username}`);
  return NextResponse.json({ ok: true });
}
