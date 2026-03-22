import { prisma } from "./prisma";
import { SessionUser } from "./auth";

export async function logAction(session: SessionUser, action: string, details = "") {
  try {
    await prisma.auditLog.create({
      data: { userId: session.userId, username: session.username, action, details },
    });
  } catch {
    // لا نوقف العملية إذا فشل التسجيل
  }
}
