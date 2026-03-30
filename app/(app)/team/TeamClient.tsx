"use client";

import { useState } from "react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date | string;
}

interface ActivityEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  comment: string;
  createdAt: Date | string;
  user: { id: string; name: string | null; email: string };
  idea: { id: string; text: string };
}

interface Props {
  users: User[];
  activityLog: ActivityEntry[];
  currentUserId: string;
  currentUserRole: string;
}

const AVATAR_COLORS = [
  "linear-gradient(135deg, #7B5CF0, #A78BFA)",
  "linear-gradient(135deg, #60A5FA, #7B5CF0)",
  "linear-gradient(135deg, #A78BFA, #EC4899)",
  "linear-gradient(135deg, #22C55E, #60A5FA)",
  "linear-gradient(135deg, #F59E0B, #EF4444)",
];

export function TeamClient({ users: initial, activityLog, currentUserId, currentUserRole }: Props) {
  const [users, setUsers] = useState(initial);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const isOwner = currentUserRole === "OWNER";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    if (res.ok) {
      setInviteMsg({ text: `Invite sent to ${inviteEmail}`, ok: true });
      setInviteEmail("");
    } else {
      setInviteMsg({ text: "Failed to send invite", ok: false });
    }
    setInviting(false);
  }

  async function handleRoleChange(id: string, role: string) {
    await fetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this team member?")) return;
    await fetch(`/api/team/${id}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-hi">Team</h1>
        <p className="text-sm text-mid mt-1">Manage your Scryon team members</p>
      </div>

      {/* Members grid */}
      <div className="animate-fade-up delay-75">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-hi">Members</h2>
          <span
            className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold text-accent-hi"
            style={{ background: "rgba(123,92,240,0.12)", border: "1px solid rgba(123,92,240,0.2)" }}
          >
            {users.length}
          </span>
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, #2A2A45, transparent)" }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {users.map((user, i) => (
            <div
              key={user.id}
              className="rounded-xl p-4 transition-all duration-200 group animate-fade-up"
              style={{
                background: "#0F0F1A",
                border: `1px solid ${user.id === currentUserId ? "rgba(123,92,240,0.25)" : "#2A2A45"}`,
                animationDelay: `${i * 50}ms`,
              }}
              onMouseEnter={(e) => {
                if (user.id !== currentUserId)
                  e.currentTarget.style.borderColor = "#2A2A45";
                e.currentTarget.style.background = "rgba(22,22,42,0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0F0F1A";
                e.currentTarget.style.borderColor = user.id === currentUserId ? "rgba(123,92,240,0.25)" : "#2A2A45";
              }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {(user.name ?? user.email).charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-hi truncate">
                      {user.name ?? user.email}
                    </p>
                    {user.id === currentUserId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-accent-hi"
                        style={{ background: "rgba(123,92,240,0.12)" }}>
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-lo truncate">{user.email}</p>
                </div>

                {/* Role + actions */}
                <div className="flex items-center gap-2">
                  {isOwner && user.id !== currentUserId ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-xs px-2 py-1.5 rounded-lg text-mid cursor-pointer transition-all"
                      style={{ background: "#16162A", border: "1px solid #2A2A45", outline: "none" }}
                    >
                      <option value="MEMBER">Member</option>
                      <option value="OWNER">Owner</option>
                    </select>
                  ) : (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={
                        user.role === "OWNER"
                          ? { background: "rgba(123,92,240,0.12)", color: "#A78BFA", border: "1px solid rgba(123,92,240,0.2)" }
                          : { background: "rgba(42,42,69,0.5)", color: "#8888AA", border: "1px solid #2A2A45" }
                      }
                    >
                      {user.role}
                    </span>
                  )}

                  {isOwner && user.id !== currentUserId && (
                    <button
                      onClick={() => handleRemove(user.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-lo hover:text-err hover:bg-err/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Joined date */}
              <p className="text-[11px] text-lo mt-3 pt-2.5" style={{ borderTop: "1px solid #1E1E35" }}>
                Joined{" "}
                {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite form */}
      {isOwner && (
        <div
          className="rounded-2xl p-5 animate-fade-up delay-150"
          style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
        >
          <h2 className="text-sm font-semibold text-hi mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite Member
          </h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="colleague@fello.com"
              className="input-dark flex-1 text-sm px-4 py-2.5 rounded-xl"
            />
            <button
              type="submit"
              disabled={inviting}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-2"
            >
              {inviting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              {inviting ? "Sending…" : "Send Invite"}
            </button>
          </form>
          {inviteMsg && (
            <p
              className="text-sm mt-3 flex items-center gap-1.5"
              style={{ color: inviteMsg.ok ? "#22C55E" : "#EF4444" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={inviteMsg.ok ? "M5 13l4 4L19 7" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
              </svg>
              {inviteMsg.text}
            </p>
          )}
        </div>
      )}

      {/* Activity feed */}
      <div className="animate-fade-up delay-200">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-hi">Activity Feed</h2>
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, #2A2A45, transparent)" }} />
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
        >
          <div className="divide-y max-h-96 overflow-y-auto" style={{ borderColor: "#1E1E35" }}>
            {activityLog.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-lo">No activity yet</p>
              </div>
            ) : (
              activityLog.map((a, i) => (
                <div
                  key={a.id}
                  className="px-5 py-3.5 flex gap-3 transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(22,22,42,0.6)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white"
                    style={{ background: "rgba(123,92,240,0.2)", color: "#A78BFA" }}
                  >
                    {(a.user.name ?? a.user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-mid">
                      <span className="font-semibold text-hi">{a.user.name ?? a.user.email}</span>
                      {" moved "}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium text-lo"
                        style={{ background: "rgba(42,42,69,0.5)" }}
                      >
                        {a.fromStatus}
                      </span>
                      {" → "}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium text-accent-hi"
                        style={{ background: "rgba(123,92,240,0.12)" }}
                      >
                        {a.toStatus}
                      </span>
                    </p>
                    <p className="text-xs text-lo mt-0.5 truncate">{a.idea.text.slice(0, 80)}</p>
                    <p className="text-[11px] text-lo/60 mt-0.5">
                      {new Date(a.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
