import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/team/[id]">
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const actor = session.user as { id?: string; role?: string };
  if (actor.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await request.json()) as { role?: string };

  if (!body.role || !["OWNER", "MEMBER"].includes(body.role)) {
    return Response.json({ success: false, error: "Valid role required" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: body.role },
    select: { id: true, email: true, name: true, role: true },
  });

  return Response.json({ success: true, data: updated });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/team/[id]">
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const actor = session.user as { id?: string; role?: string };
  if (actor.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  // Prevent self-deletion
  if (actor.id === id) {
    return Response.json({ success: false, error: "Cannot remove yourself" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return Response.json({ success: true, data: null });
}
