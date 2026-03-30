import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const docs = await prisma.contextDoc.findMany({
    select: { id: true, type: true, content: true, updatedAt: true, updatedBy: true },
  });

  return Response.json({ success: true, data: docs });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { type?: string; content?: string };

  if (!body.type || !body.content) {
    return Response.json(
      { success: false, error: "type and content are required" },
      { status: 400 }
    );
  }

  const validTypes = ["FELLO", "GTM"];
  if (!validTypes.includes(body.type)) {
    return Response.json({ success: false, error: "Invalid type" }, { status: 400 });
  }

  // FELLO context: owner only
  const user = session.user as { id?: string; role?: string };
  if (body.type === "FELLO" && user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  if (!user.id) {
    return Response.json({ success: false, error: "Session missing user id" }, { status: 401 });
  }

  try {
    const existing = await prisma.contextDoc.findFirst({ where: { type: body.type } });

    if (existing) {
      const doc = await prisma.contextDoc.update({
        where: { id: existing.id },
        data: { content: body.content, updatedBy: user.id },
        select: { id: true, type: true, content: true, updatedAt: true },
      });
      return Response.json({ success: true, data: doc });
    } else {
      const doc = await prisma.contextDoc.create({
        data: { type: body.type, content: body.content, updatedBy: user.id },
        select: { id: true, type: true, content: true, updatedAt: true },
      });
      return Response.json({ success: true, data: doc }, { status: 201 });
    }
  } catch (error) {
    return Response.json({ success: false, error: "Failed to save context" }, { status: 500 });
  }
}
