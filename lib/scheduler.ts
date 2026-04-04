import cron, { ScheduledTask } from "node-cron";
import { prisma } from "./prisma";
import { runDailyBrief } from "./intelligence";

let currentJob: ScheduledTask | null = null;

export async function startScheduler() {
  try {
    const settings = await prisma.settings.findFirst();
    const time = settings?.briefTime ?? "08:00";
    const timezone = settings?.timezone ?? "America/New_York";
    scheduleJob(time, timezone);
  } catch (error) {
    console.error("[Scryon Scheduler] Failed to read settings on startup:", error);
    scheduleJob("08:00", "America/New_York");
  }
}

export function scheduleJob(time: string, timezone: string) {
  if (currentJob) {
    currentJob.stop();
    currentJob = null;
  }

  const parts = time.split(":");
  const hours = parts[0] ?? "8";
  const minutes = parts[1] ?? "0";
  const cronExpression = `${minutes} ${hours} * * *`;

  console.log(
    `[Scryon Scheduler] Scheduling brief at ${time} ${timezone} — cron: ${cronExpression}`
  );

  currentJob = cron.schedule(
    cronExpression,
    async () => {
      console.log("[Scryon Scheduler] Firing brief generation...");
      try {
        await runDailyBrief();
        console.log("[Scryon Scheduler] Brief generation complete.");
      } catch (error) {
        console.error("[Scryon Scheduler] Brief generation failed:", error);
      }
    },
    { timezone }
  );
}

export function restartWithNewTime(time: string, timezone: string) {
  scheduleJob(time, timezone);
}
