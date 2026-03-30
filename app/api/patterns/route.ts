import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const patterns = await prisma.pattern.findMany({
    orderBy: { frequency: "desc" },
    include: {
      briefIds: {
        select: { briefId: true },
      },
    },
  });

  return Response.json({ success: true, data: patterns });
}
