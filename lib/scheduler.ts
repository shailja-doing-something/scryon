import cron, { ScheduledTask } from "node-cron";
import { prisma } from "./prisma";
import { runDailyBrief } from "./intelligence";

let currentJob: ScheduledTask | null = null;

export async function startScheduler() {
  console.log("[Scheduler] Starting...");
  try {
    const settings = await prisma.settings.findFirst();
    console.log("[Scheduler] Settings found:", settings ? "yes" : "no");
    const time = settings?.briefTime ?? "08:00";
    const timezone = settings?.timezone ?? "America/New_York";
    console.log(`[Scheduler] Will run at ${time} ${timezone}`);
    scheduleJob(time, timezone);
  } catch (error) {
    console.error("[Scheduler] Error reading settings:", error);
    console.log("[Scheduler] Falling back to 08:00 UTC");
    scheduleJob("08:00", "UTC");
  }
}

export function scheduleJob(time: string, timezone: string) {
  if (currentJob) {
    currentJob.stop();
    currentJob = null;
    console.log("[Scheduler] Stopped previous job.");
  }

  const parts = time.split(":");
  const hours = parts[0] ?? "8";
  const minutes = parts[1] ?? "0";
  const cronExpression = `${minutes} ${hours} * * *`;

  console.log(`[Scheduler] Cron expression: ${cronExpression}`);
  console.log(`[Scheduler] Timezone: ${timezone}`);

  currentJob = cron.schedule(
    cronExpression,
    async () => {
      console.log("[Scheduler] FIRING — starting brief generation");
      try {
        await runDailyBrief();
        console.log("[Scheduler] Brief generation complete.");
      } catch (error) {
        console.error("[Scheduler] Brief generation failed:", error);
      }
    },
    { timezone }
  );

  console.log("[Scheduler] Job scheduled successfully.");
}

export function restartWithNewTime(time: string, timezone: string) {
  scheduleJob(time, timezone);
}
