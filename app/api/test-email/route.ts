import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBriefDigest } from "@/lib/email";

export async function GET(request: NextRequest) {
  // Accept either a valid session or CRON_SECRET header
  const auth = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronAuth = cronSecret && auth === `Bearer ${cronSecret}`;

  if (!hasCronAuth) {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  // Find the most recent READY brief to use as the test payload
  const brief = await prisma.brief.findFirst({
    where: { status: "READY" },
    orderBy: { generatedAt: "desc" },
    select: { id: true },
  });

  if (!brief) {
    return Response.json(
      { success: false, error: "No READY brief found. Generate a brief first." },
      { status: 404 }
    );
  }

  const result = await sendBriefDigest(brief.id);

  return Response.json({ success: result.success, data: result }, { status: result.success ? 200 : 500 });
}
