import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runDailyBrief } from "@/lib/intelligence";
import { logger } from "@/lib/logger";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let focusArea = "";
  try {
    const body = (await request.json()) as { focusArea?: string };
    focusArea = body.focusArea ?? "";
  } catch {
    // body is optional
  }

  try {
    logger.info("Manual brief generation triggered", { focusArea });
    const briefId = await runDailyBrief(focusArea);
    return Response.json({ success: true, data: { briefId } });
  } catch (error) {
    logger.error("Brief generation failed", { error: String(error) });
    return Response.json({ success: false, error: "Brief generation failed" }, { status: 500 });
  }
}
