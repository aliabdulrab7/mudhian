import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const user = await prisma.user.findUnique({
    where: { username },
    include: { branch: true },
  });

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const token = await signToken({
    userId: user.id,
    username: user.username,
    role: user.role as "admin" | "branch",
    branchId: user.branchId ?? undefined,
    branchName: user.branch?.name ?? undefined,
  });

  const res = NextResponse.json({ ok: true, role: user.role, branchId: user.branchId });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  return res;
}
