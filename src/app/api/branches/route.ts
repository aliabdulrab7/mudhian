import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const branches = await prisma.branch.findMany({
    orderBy: { id: "asc" },
    include: { users: { select: { id: true, username: true } } },
  });
  return NextResponse.json(branches);
}

// Create branch + branch user
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { name, branchNum, username, password } = await req.json();

  const branch = await prisma.branch.create({ data: { name, branchNum: branchNum || "" } });

  const hashed = bcrypt.hashSync(password, 10);
  await prisma.user.create({
    data: { username, password: hashed, role: "branch", branchId: branch.id },
  });

  await logAction(session!, "إضافة فرع", `فرع: ${name} — مستخدم: ${username}`);
  return NextResponse.json(branch, { status: 201 });
}
