import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const sources = await prisma.source.findMany({ orderBy: { label: "asc" } });
  return Response.json({ success: true, data: sources });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    type?: string;
    url?: string;
    label?: string;
  };

  if (!body.type || !body.url || !body.label) {
    return Response.json(
      { success: false, error: "type, url, and label are required" },
      { status: 400 }
    );
  }

  const validTypes = ["RSS", "TELEGRAM", "GITHUB", "MANUAL"];
  if (!validTypes.includes(body.type)) {
    return Response.json(
      { success: false, error: "Invalid source type" },
      { status: 400 }
    );
  }

  try {
    const source = await prisma.source.create({
      data: { type: body.type, url: body.url, label: body.label, active: true },
    });
    return Response.json({ success: true, data: source }, { status: 201 });
  } catch {
    return Response.json({ success: false, error: "Failed to create source" }, { status: 500 });
  }
}
