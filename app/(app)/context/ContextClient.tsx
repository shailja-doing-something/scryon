"use client";

import { useState } from "react";

interface Props {
  felloContent: string;
  gtmContent: string;
  felloUpdatedAt: string | null;
  gtmUpdatedAt: string | null;
  userRole: string;
}

export function ContextClient({
  felloContent: initialFello,
  gtmContent: initialGtm,
  felloUpdatedAt,
  gtmUpdatedAt,
  userRole,
}: Props) {
  const [fello, setFello] = useState(initialFello);
  const [gtm, setGtm] = useState(initialGtm);
  const [savingFello, setSavingFello] = useState(false);
  const [savingGtm, setSavingGtm] = useState(false);
  const [felloMsg, setFelloMsg] = useState("");
  const [gtmMsg, setGtmMsg] = useState("");

  const isOwner = userRole === "OWNER";

  async function saveContext(type: "FELLO" | "GTM", content: string) {
    const res = await fetch("/api/context", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content }),
    });
    return res.ok;
  }

  async function handleSaveFello() {
    setSavingFello(true);
    const ok = await saveContext("FELLO", fello);
    setFelloMsg(ok ? "Saved!" : "Failed to save");
    setTimeout(() => setFelloMsg(""), 2000);
    setSavingFello(false);
  }

  async function handleSaveGtm() {
    setSavingGtm(true);
    const ok = await saveContext("GTM", gtm);
    setGtmMsg(ok ? "Saved!" : "Failed to save");
    setTimeout(() => setGtmMsg(""), 2000);
    setSavingGtm(false);
  }

  const textareaCls = "w-full text-sm px-3 py-2 bg-elevated border border-rim rounded-lg text-hi placeholder-lo focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none transition-colors font-mono disabled:opacity-40";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hi">Context Editor</h1>
        <p className="text-sm text-mid mt-1">
          This context is injected into every Gemini prompt. Changes affect all future generations.
        </p>
      </div>

      <div
        className="rounded-xl p-4 text-sm font-medium text-warn"
        style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)" }}
      >
        Warning: Changes to context will affect all future brief generations.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fello context */}
        <div className="bg-surface border border-rim rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-hi">Fello Product Context</h2>
            {!isOwner && (
              <span
                className="text-xs text-lo px-2 py-0.5 rounded-full"
                style={{ background: "rgba(42,42,69,0.6)", border: "1px solid #2A2A45" }}
              >
                Owner only
              </span>
            )}
          </div>
          {felloUpdatedAt && (
            <p className="text-xs text-lo">
              Updated {new Date(felloUpdatedAt).toLocaleDateString()}
            </p>
          )}
          <textarea
            value={fello}
            onChange={(e) => setFello(e.target.value)}
            disabled={!isOwner}
            rows={12}
            className={textareaCls}
          />
          {isOwner && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveFello}
                disabled={savingFello}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
                style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
              >
                {savingFello ? "Saving…" : "Save Fello Context"}
              </button>
              {felloMsg && (
                <span className={`text-sm font-medium ${felloMsg === "Saved!" ? "text-ok" : "text-err"}`}>
                  {felloMsg}
                </span>
              )}
            </div>
          )}
        </div>

        {/* GTM context */}
        <div className="bg-surface border border-rim rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-hi">GTM AI Team Context</h2>
          {gtmUpdatedAt && (
            <p className="text-xs text-lo">
              Updated {new Date(gtmUpdatedAt).toLocaleDateString()}
            </p>
          )}
          <textarea
            value={gtm}
            onChange={(e) => setGtm(e.target.value)}
            rows={12}
            className={textareaCls}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveGtm}
              disabled={savingGtm}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
            >
              {savingGtm ? "Saving…" : "Save GTM Context"}
            </button>
            {gtmMsg && (
              <span className={`text-sm font-medium ${gtmMsg === "Saved!" ? "text-ok" : "text-err"}`}>
                {gtmMsg}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
