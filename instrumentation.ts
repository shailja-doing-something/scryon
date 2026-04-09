export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Scryon] Server starting...");
    console.log("[Scryon] Loading scheduler...");
    try {
      const { startScheduler } = await import("./lib/scheduler");
      await startScheduler();
      console.log("[Scryon] Scheduler loaded successfully.");
    } catch (error) {
      console.error("[Scryon] Scheduler failed to load:", error);
    }
  }
}
