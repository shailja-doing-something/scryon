import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id?: string };
  if (!user.id) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, type: true, message: true, read: true, createdAt: true },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return Response.json({ success: true, data: { notifications, unreadCount } });
}

export async function PATCH(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id?: string };
  if (!user.id) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  return Response.json({ success: true, data: null });
}
