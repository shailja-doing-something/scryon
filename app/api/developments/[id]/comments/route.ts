import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/developments/[id]/comments">
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id?: string };
  if (!user.id) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = (await request.json()) as { text?: string };

  if (!body.text?.trim()) {
    return Response.json({ success: false, error: "text is required" }, { status: 400 });
  }

  try {
    const comment = await prisma.comment.create({
      data: { developmentId: id, userId: user.id, text: body.text.trim() },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Notify other team members
    const users = await prisma.user.findMany({
      where: { NOT: { id: user.id } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: "COMMENT_POSTED",
        message: `New comment posted by ${session.user?.name ?? "a teammate"}`,
        read: false,
      })),
    });

    return Response.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create comment", { error: String(error) });
    return Response.json({ success: false, error: "Failed to create comment" }, { status: 500 });
  }
}
