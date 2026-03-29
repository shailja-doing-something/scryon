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

export function TeamClient({ users: initial, activityLog, currentUserId, currentUserRole }: Props) {
  const [users, setUsers] = useState(initial);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const isOwner = currentUserRole === "OWNER";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg("");
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    if (res.ok) {
      setInviteMsg(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
    } else {
      setInviteMsg("Failed to send invite");
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-hi">Team</h1>
        <p className="text-sm text-mid mt-1">Manage your Scryon team members</p>
      </div>

      {/* Invite */}
      {isOwner && (
        <div className="bg-surface border border-rim rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-hi mb-4">Invite Member</h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="colleague@fello.com"
              className="flex-1 text-sm px-3 py-2 bg-elevated border border-rim rounded-lg text-hi placeholder-lo focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
            >
              {inviting ? "Sending…" : "Send Invite"}
            </button>
          </form>
          {inviteMsg && (
            <p className={`text-sm mt-2 ${inviteMsg.startsWith("Invite") ? "text-ok" : "text-err"}`}>
              {inviteMsg}
            </p>
          )}
        </div>
      )}

      {/* Member list */}
      <div className="bg-surface border border-rim rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-rim">
          <h2 className="font-semibold text-hi text-sm">
            Members ({users.length})
          </h2>
        </div>
        <div className="divide-y divide-rim">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-4 px-5 py-4 hover:bg-elevated transition-colors">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
              >
                {(user.name ?? user.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-hi text-sm truncate">
                  {user.name ?? user.email}
                </p>
                <p className="text-xs text-lo truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && user.id !== currentUserId ? (
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="text-xs px-2 py-1 bg-elevated border border-rim rounded-lg text-mid focus:outline-none focus:border-accent transition-colors"
                    style={{ background: "#16162A" }}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="OWNER">Owner</option>
                  </select>
                ) : (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={
                      user.role === "OWNER"
                        ? { background: "rgba(123,92,240,0.12)", color: "#A78BFA", border: "1px solid rgba(123,92,240,0.2)" }
                        : { background: "rgba(42,42,69,0.6)", color: "#8888AA", border: "1px solid #2A2A45" }
                    }
                  >
                    {user.role}
                  </span>
                )}
                <span className="text-xs text-lo hidden md:block">
                  Joined{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {isOwner && user.id !== currentUserId && (
                  <button
                    onClick={() => handleRemove(user.id)}
                    className="text-lo hover:text-err transition-colors ml-1 text-lg"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity feed */}
      <div className="bg-surface border border-rim rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-rim">
          <h2 className="font-semibold text-hi text-sm">Activity Feed</h2>
        </div>
        <div className="divide-y divide-rim max-h-96 overflow-y-auto">
          {activityLog.length === 0 ? (
            <p className="text-sm text-lo text-center py-8">No activity yet</p>
          ) : (
            activityLog.map((a) => (
              <div key={a.id} className="px-5 py-3 flex gap-3 hover:bg-elevated transition-colors">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white"
                  style={{ background: "rgba(123,92,240,0.25)" }}
                >
                  <span className="text-accent-hi">
                    {(a.user.name ?? a.user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-mid">
                    <span className="font-medium text-hi">{a.user.name ?? a.user.email}</span>
                    {" moved idea from "}
                    <span className="font-medium text-hi">{a.fromStatus}</span>
                    {" → "}
                    <span className="font-medium text-accent-hi">{a.toStatus}</span>
                  </p>
                  <p className="text-xs text-lo mt-0.5 truncate">{a.idea.text.slice(0, 80)}</p>
                  <p className="text-xs text-lo mt-0.5">
                    {new Date(a.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
