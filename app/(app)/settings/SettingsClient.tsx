"use client";

import { useState } from "react";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
];

interface Settings {
  briefTime: string;
  timezone: string;
  emailDigest: boolean;
  emailRecipients: string;
}

export function SettingsClient({ settings: initial }: { settings: Settings }) {
  const [settings, setSettings] = useState({
    ...initial,
    emailRecipients: (JSON.parse(initial.emailRecipients) as string[]).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    const recipients = settings.emailRecipients
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        briefTime: settings.briefTime,
        timezone: settings.timezone,
        emailDigest: settings.emailDigest,
        emailRecipients: recipients,
      }),
    });

    setMsg(res.ok ? "Settings saved!" : "Failed to save");
    setTimeout(() => setMsg(""), 2000);
    setSaving(false);
  }

  const inputCls = "text-sm px-3 py-2 bg-elevated border border-rim rounded-lg text-hi placeholder-lo focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors";

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-hi">Settings</h1>
        <p className="text-sm text-mid mt-1">Configure your Scryon preferences</p>
      </div>

      <form onSubmit={handleSave} className="bg-surface border border-rim rounded-2xl p-6 space-y-6">
        {/* Brief time */}
        <div>
          <label className="block text-xs font-semibold text-mid uppercase tracking-wider mb-2">
            Brief Generation Time
          </label>
          <input
            type="time"
            value={settings.briefTime}
            onChange={(e) => setSettings((s) => ({ ...s, briefTime: e.target.value }))}
            className={inputCls}
            style={{ colorScheme: "dark" }}
          />
          <p className="text-xs text-lo mt-1.5">
            Railway cron will hit the API at this time daily
          </p>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-xs font-semibold text-mid uppercase tracking-wider mb-2">
            Timezone
          </label>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
            className={`${inputCls} w-full max-w-xs cursor-pointer`}
            style={{ background: "#16162A" }}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        {/* Email digest */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.emailDigest}
                onChange={(e) => setSettings((s) => ({ ...s, emailDigest: e.target.checked }))}
                className="sr-only"
              />
              <div
                className="w-10 h-6 rounded-full transition-all"
                style={{
                  background: settings.emailDigest
                    ? "linear-gradient(135deg, #7B5CF0, #A78BFA)"
                    : "#2A2A45",
                }}
              >
                <div
                  className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: settings.emailDigest ? "translateX(18px)" : "translateX(4px)" }}
                />
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-hi">Daily email digest</span>
              <p className="text-xs text-lo">Receive a summary email after each brief</p>
            </div>
          </label>
        </div>

        {/* Email recipients */}
        {settings.emailDigest && (
          <div>
            <label className="block text-xs font-semibold text-mid uppercase tracking-wider mb-2">
              Email Recipients
            </label>
            <input
              type="text"
              value={settings.emailRecipients}
              onChange={(e) => setSettings((s) => ({ ...s, emailRecipients: e.target.value }))}
              placeholder="email1@fello.com, email2@fello.com"
              className={`w-full ${inputCls}`}
            />
            <p className="text-xs text-lo mt-1.5">Comma-separated email addresses</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-rim">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
          {msg && (
            <span className={`text-sm font-medium ${msg.includes("saved") ? "text-ok" : "text-err"}`}>
              {msg}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
