import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/comments/[id]">
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id?: string };
  if (!user.id) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!comment) {
      return Response.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (comment.userId !== user.id) {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete comment", { error: String(error) });
    return Response.json({ success: false, error: "Failed to delete comment" }, { status: 500 });
  }
}
