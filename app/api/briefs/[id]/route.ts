import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/briefs/[id]">
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const brief = await prisma.brief.findUnique({
    where: { id },
    include: {
      developments: {
        orderBy: { rank: "asc" },
        include: {
          ideas: { orderBy: { createdAt: "asc" } },
          comments: {
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { upvotes: true } },
        },
      },
    },
  });

  if (!brief) return Response.json({ success: false, error: "Not found" }, { status: 404 });

  return Response.json({ success: true, data: brief });
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/briefs/[id]">
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = (await request.json()) as { focusArea?: string };

  if (body.focusArea === undefined) {
    return Response.json({ success: false, error: "focusArea required" }, { status: 400 });
  }

  const brief = await prisma.brief.update({
    where: { id },
    data: { focusArea: body.focusArea },
    select: { id: true, focusArea: true },
  });

  return Response.json({ success: true, data: brief });
}
