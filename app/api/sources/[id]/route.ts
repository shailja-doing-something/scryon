import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/sources/[id]">
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = (await request.json()) as { active?: boolean; label?: string };

  const source = await prisma.source.update({
    where: { id },
    data: {
      ...(body.active !== undefined && { active: body.active }),
      ...(body.label && { label: body.label }),
    },
  });

  return Response.json({ success: true, data: source });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/sources/[id]">
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  await prisma.source.delete({ where: { id } });
  return Response.json({ success: true, data: null });
}
