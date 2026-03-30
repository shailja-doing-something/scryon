import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/developments/[id]/upvote">
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id?: string };
  if (!user.id) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const existing = await prisma.upvote.findUnique({
    where: { developmentId_userId: { developmentId: id, userId: user.id } },
  });

  if (existing) {
    await prisma.upvote.delete({ where: { id: existing.id } });
    const count = await prisma.upvote.count({ where: { developmentId: id } });
    return Response.json({ success: true, data: { upvoted: false, count } });
  }

  await prisma.upvote.create({ data: { developmentId: id, userId: user.id } });
  const count = await prisma.upvote.count({ where: { developmentId: id } });
  return Response.json({ success: true, data: { upvoted: true, count } });
}
