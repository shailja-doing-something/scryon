import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const skip = (page - 1) * limit;

  const [briefs, total] = await Promise.all([
    prisma.brief.findMany({
      orderBy: { date: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        date: true,
        focusArea: true,
        status: true,
        generatedAt: true,
        _count: { select: { developments: true } },
      },
    }),
    prisma.brief.count(),
  ]);

  return Response.json({ success: true, data: { briefs, total, page, limit } });
}
