import { Resend } from "resend";
import { prisma } from "./prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
  skipped?: string;
}

export async function sendBriefDigest(briefId: string): Promise<SendResult> {
  // ── Read settings ──────────────────────────────────────────────
  console.log("[Email] Checking settings for email digest...");

  const settings = await prisma.settings.findFirst({
    where: { user: { role: "OWNER" } },
  });

  if (!settings) {
    console.log("[Email] No settings found, skipping.");
    return { success: true, skipped: "no settings" };
  }

  console.log("[Email] emailDigest enabled:", settings.emailDigest);
  console.log("[Email] recipients raw:", settings.emailRecipients);

  if (!settings.emailDigest) {
    console.log("[Email] Email digest disabled, skipping.");
    return { success: true, skipped: "digest disabled" };
  }

  let recipients: string[] = [];
  try {
    const parsed: unknown = JSON.parse(settings.emailRecipients);
    if (Array.isArray(parsed)) {
      recipients = (parsed as unknown[]).filter((r): r is string => typeof r === "string" && r.trim().length > 0);
    }
  } catch {
    recipients = settings.emailRecipients
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
  }

  if (recipients.length === 0) {
    console.log("[Email] No recipients configured, skipping.");
    return { success: true, skipped: "no recipients" };
  }

  console.log("[Email] Sending to:", recipients);

  // ── Read brief + top developments ─────────────────────────────
  const brief = await prisma.brief.findUnique({
    where: { id: briefId },
    include: {
      developments: {
        orderBy: { rank: "asc" },
        take: 5,
        include: { ideas: { select: { id: true } } },
      },
    },
  });

  if (!brief) {
    console.log("[Email] Brief not found:", briefId);
    return { success: false, error: "brief not found" };
  }

  // ── Build email ────────────────────────────────────────────────
  const formattedDate = new Date(brief.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalIdeas = brief.developments.reduce((sum, d) => sum + d.ideas.length, 0);

  const avgScore =
    brief.developments.length > 0
      ? (
          brief.developments.reduce((sum, d) => {
            const s = JSON.parse(d.scores || "{}") as { weighted?: number };
            return sum + (s.weighted ?? 0);
          }, 0) / brief.developments.length
        ).toFixed(1)
      : "—";

  const devRows = brief.developments
    .map(
      (d) => `
    <div style="border-left: 3px solid #7B5CF0; padding-left: 16px; margin-bottom: 20px;">
      <p style="font-weight: 500; margin: 0 0 4px; color: #F0F0FF;">${d.title}</p>
      <p style="color: #8888AA; font-size: 13px; margin: 0;">
        ${d.fitInFello ? d.fitInFello.slice(0, 160) + (d.fitInFello.length > 160 ? "…" : "") : "No analysis available."}
      </p>
    </div>`
    )
    .join("");

  const appUrl = process.env.NEXTAUTH_URL ?? "https://scryon.app";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #050508;">
<div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #080810; color: #F0F0FF; padding: 32px; border-radius: 12px;">

  <div style="margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #2A2A45;">
    <span style="font-size: 18px; font-weight: 700; letter-spacing: -0.5px; color: #F0F0FF;">
      scry<span style="color: #7B5CF0;">on</span>
    </span>
  </div>

  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 4px; color: #F0F0FF;">Daily AI Intelligence Brief</h1>
  <p style="color: #8888AA; font-size: 14px; margin: 0 0 32px;">${formattedDate}</p>

  <p style="font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: #55557A; text-transform: uppercase; margin-bottom: 16px;">
    Top Developments Today
  </p>

  ${devRows}

  <div style="border-top: 1px solid #2A2A45; padding-top: 20px; margin-top: 8px;">
    <p style="color: #8888AA; font-size: 13px; margin: 0 0 12px;">
      ${totalIdeas} idea${totalIdeas !== 1 ? "s" : ""} generated and added to your tracker.
      Avg relevance score: <strong style="color: #A78BFA;">${avgScore}</strong>
    </p>
    <a href="${appUrl}/dashboard"
       style="display: inline-block; background: linear-gradient(135deg, #7B5CF0, #A78BFA); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
      View Full Brief
    </a>
  </div>

  <p style="color: #55557A; font-size: 12px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #1E1E35;">
    Scryon · Fello.ai GTM AI Team ·
    <a href="${appUrl}/settings" style="color: #7B5CF0; text-decoration: none;">Manage preferences</a>
  </p>

</div>
</body>
</html>`;

  // ── Send ───────────────────────────────────────────────────────
  console.log("[Email] Attempting to send via Resend...");

  const { data, error } = await resend.emails.send({
    from: "Scryon <onboarding@resend.dev>",
    to: recipients,
    subject: `Scryon Intel — ${formattedDate}`,
    html,
  });

  if (error) {
    console.error("[Email] Resend error:", error);
    return { success: false, error: JSON.stringify(error) };
  }

  console.log("[Email] Sent successfully:", data?.id);
  return { success: true, id: data?.id };
}
