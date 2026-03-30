import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const VALID_STATUSES = ["GENERATED", "CONSIDERING", "PROTOTYPING", "WORKED", "FAILED"];

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/ideas/[id]">
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id?: string };
  if (!user.id) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = (await request.json()) as { status?: string; comment?: string };

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return Response.json({ success: false, error: "Valid status required" }, { status: 400 });
  }

  try {
    const idea = await prisma.idea.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!idea) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    const [updated] = await prisma.$transaction([
      prisma.idea.update({
        where: { id },
        data: { status: body.status },
        select: { id: true, status: true, type: true, text: true },
      }),
      prisma.ideaActivity.create({
        data: {
          ideaId: id,
          userId: user.id,
          fromStatus: idea.status,
          toStatus: body.status,
          comment: body.comment ?? "",
        },
      }),
    ]);

    // Notify via in-app notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "IDEA_STATUS_CHANGED",
        message: `Idea moved from ${idea.status} to ${body.status}`,
        read: false,
      },
    }).catch(() => {});

    return Response.json({ success: true, data: updated });
  } catch (error) {
    logger.error("Failed to update idea", { id, error: String(error) });
    return Response.json({ success: false, error: "Failed to update idea" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/ideas/[id]">
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      activities: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!idea) return Response.json({ success: false, error: "Not found" }, { status: 404 });
  return Response.json({ success: true, data: idea });
}
