import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, branchNum, username, password } = body;

  const branch = await prisma.branch.update({
    where: { id: parseInt(id) },
    data: { name, branchNum },
  });

  if (username || password) {
    const user = await prisma.user.findFirst({ where: { branchId: parseInt(id), role: "branch" } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(username ? { username } : {}),
          ...(password ? { password: bcrypt.hashSync(password, 10) } : {}),
        },
      });
    }
  }

  await logAction(session!, "تعديل فرع", `فرع: ${branch.name}`);
  return NextResponse.json(branch);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const branch = await prisma.branch.findUnique({ where: { id: parseInt(id) } });
  await prisma.branch.delete({ where: { id: parseInt(id) } });
  await logAction(session!, "حذف فرع", `فرع: ${branch?.name ?? id}`);
  return NextResponse.json({ ok: true });
}
