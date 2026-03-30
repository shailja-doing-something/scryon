"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { NotificationBell } from "@/components/NotificationBell";
import { Logo } from "@/components/Logo";

const navLinks = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/tracker",
    label: "Tracker",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    href: "/archive",
    label: "Archive",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    href: "/patterns",
    label: "Patterns",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    href: "/sources",
    label: "Sources",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    href: "/context",
    label: "Context",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/team",
    label: "Team",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const displayName = session?.user?.name ?? session?.user?.email ?? "?";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 w-60 flex flex-col"
      style={{
        background: "#080810",
        borderRight: "1px solid #2A2A45",
        boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Top glow orb */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(123,92,240,0.12) 0%, transparent 70%)" }}
      />

      {/* Logo */}
      <div className="relative px-4 py-5 border-b border-rim">
        <Link href="/dashboard" className="block">
          <Logo variant="primary" size={36} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navLinks.map((link, i) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
              style={
                active
                  ? {
                      background: "linear-gradient(135deg, rgba(123,92,240,0.18), rgba(167,139,250,0.08))",
                      color: "#A78BFA",
                      animationDelay: `${i * 40}ms`,
                    }
                  : { color: "#55557A" }
              }
            >
              {/* Active background glow */}
              {active && (
                <span
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ boxShadow: "inset 0 0 0 1px rgba(123,92,240,0.25)" }}
                />
              )}

              {/* Icon */}
              <span
                style={{
                  color: active ? "#7B5CF0" : undefined,
                  transition: "color 0.2s",
                }}
                className={active ? "" : "group-hover:text-mid transition-colors"}
              >
                {link.icon}
              </span>

              {/* Label */}
              <span
                className={active ? "" : "group-hover:text-mid transition-colors"}
              >
                {link.label}
              </span>

              {/* Active indicator */}
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full nav-active-dot flex-shrink-0"
                  style={{ background: "#7B5CF0" }}
                />
              )}

              {/* Hover glow (non-active) */}
              {!active && (
                <span
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{ background: "rgba(42,42,69,0.5)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="px-4">
        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, #2A2A45, transparent)" }} />
      </div>

      {/* Notifications */}
      <div className="px-2 py-2">
        <NotificationBell />
      </div>

      {/* User card */}
      <div className="px-2 pb-3">
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group transition-all duration-200"
          style={{ border: "1px solid transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(42,42,69,0.5)";
            e.currentTarget.style.borderColor = "#2A2A45";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
          >
            {initials}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-hi truncate">{displayName}</p>
            <p className="text-[10px] text-lo truncate">{session?.user?.email}</p>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-lo hover:text-err transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
            title="Sign out"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
