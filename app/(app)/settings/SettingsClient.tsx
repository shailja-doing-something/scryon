"use client";

import { useState } from "react";

const TIMEZONES = [
  { value: "America/New_York",    label: "America/New_York (ET)" },
  { value: "America/Chicago",     label: "America/Chicago (CT)" },
  { value: "America/Denver",      label: "America/Denver (MT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { value: "Asia/Kolkata",        label: "Asia/Kolkata (IST)" },
  { value: "Europe/London",       label: "Europe/London (GMT)" },
  { value: "Europe/Paris",        label: "Europe/Paris (CET)" },
  { value: "Asia/Singapore",      label: "Asia/Singapore (SGT)" },
  { value: "Asia/Tokyo",          label: "Asia/Tokyo (JST)" },
  { value: "Australia/Sydney",    label: "Australia/Sydney (AEST)" },
];

interface Settings {
  briefTime: string;
  timezone: string;
  emailDigest: boolean;
  emailRecipients: string;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
      style={{
        background: checked
          ? "linear-gradient(135deg, #7B5CF0, #A78BFA)"
          : "#2A2A45",
        boxShadow: checked ? "0 0 12px rgba(123,92,240,0.4)" : "none",
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-5" style={{ borderBottom: "1px solid #1E1E35" }}>
      <div className="flex-1">
        <p className="text-sm font-semibold text-hi">{label}</p>
        {description && <p className="text-xs text-lo mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function SettingsClient({ settings: initial }: { settings: Settings }) {
  const [settings, setSettings] = useState({
    ...initial,
    emailRecipients: (JSON.parse(initial.emailRecipients) as string[]).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

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

    setMsg({ text: res.ok ? "Settings saved!" : "Failed to save", ok: res.ok });
    setTimeout(() => setMsg(null), 2500);
    setSaving(false);
  }

  return (
    <div className="space-y-7 max-w-2xl">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-hi">Settings</h1>
        <p className="text-sm text-mid mt-1">Configure your Scryon intelligence pipeline</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 animate-fade-up delay-75">
        {/* Brief generation */}
        <div
          className="rounded-2xl px-6 overflow-hidden"
          style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
        >
          {/* Section header */}
          <div className="py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #1E1E35" }}>
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-sm font-semibold text-hi">Intelligence Pipeline</h2>
          </div>

          <SettingRow
            label="Brief Generation Time"
            description="Brief auto-generates at this time daily. Changes take effect immediately when you save."
          >
            <input
              type="time"
              value={settings.briefTime}
              onChange={(e) => setSettings((s) => ({ ...s, briefTime: e.target.value }))}
              className="input-dark text-sm px-3 py-2 rounded-xl font-mono"
              style={{ colorScheme: "dark" }}
            />
          </SettingRow>

          <SettingRow
            label="Timezone"
            description="Used to schedule the daily brief at the right local time"
          >
            <select
              value={settings.timezone}
              onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
              className="input-dark text-sm px-3 py-2 rounded-xl cursor-pointer w-52"
              style={{ background: "#16162A" }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </SettingRow>
        </div>

        {/* Email */}
        <div
          className="rounded-2xl px-6 overflow-hidden"
          style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
        >
          <div className="py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #1E1E35" }}>
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className="text-sm font-semibold text-hi">Email Digest</h2>
          </div>

          <SettingRow
            label="Daily email digest"
            description="Receive a brief summary after each intelligence run"
          >
            <Toggle
              checked={settings.emailDigest}
              onChange={(v) => setSettings((s) => ({ ...s, emailDigest: v }))}
            />
          </SettingRow>

          {settings.emailDigest && (
            <div className="py-5 animate-fade-in">
              <label className="block text-xs font-semibold text-lo uppercase tracking-widest mb-2">
                Recipients
              </label>
              <input
                type="text"
                value={settings.emailRecipients}
                onChange={(e) => setSettings((s) => ({ ...s, emailRecipients: e.target.value }))}
                placeholder="email1@fello.com, email2@fello.com"
                className="input-dark w-full text-sm px-4 py-2.5 rounded-xl"
              />
              <p className="text-xs text-lo mt-2">Comma-separated email addresses</p>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-6 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Settings
              </>
            )}
          </button>
          {msg && (
            <span
              className="text-sm font-medium flex items-center gap-1.5 animate-fade-in"
              style={{ color: msg.ok ? "#22C55E" : "#EF4444" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={msg.ok ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
              </svg>
              {msg.text}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
