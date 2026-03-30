import { NextRequest } from "next/server";
import { runDailyBrief } from "@/lib/intelligence";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes for Railway

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let focusArea = "";
  try {
    const body = (await request.json()) as { focusArea?: string };
    focusArea = body.focusArea ?? "";
  } catch {
    // body is optional
  }

  try {
    logger.info("Cron: starting brief generation", { focusArea });
    const briefId = await runDailyBrief(focusArea);
    logger.info("Cron: brief generation complete", { briefId });
    return Response.json({ success: true, data: { briefId } });
  } catch (error) {
    logger.error("Cron: brief generation failed", { error: String(error) });
    return Response.json({ success: false, error: "Brief generation failed" }, { status: 500 });
  }
}
