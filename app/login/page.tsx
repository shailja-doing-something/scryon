"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email: email.trim(), name: name.trim(), redirect: false });
    if (result?.error) {
      setError("Sign in failed. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas overflow-hidden relative">
      {/* Background orbs */}
      <div
        className="absolute w-[600px] h-[600px] orb animate-orb"
        style={{
          background: "radial-gradient(circle, rgba(123,92,240,0.18) 0%, transparent 70%)",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          animationDuration: "12s",
        }}
      />
      <div
        className="absolute w-96 h-96 orb animate-orb"
        style={{
          background: "radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 70%)",
          bottom: "5%",
          left: "20%",
          animationDuration: "9s",
          animationDelay: "3s",
        }}
      />
      <div
        className="absolute w-64 h-64 orb animate-orb"
        style={{
          background: "radial-gradient(circle, rgba(96,165,250,0.07) 0%, transparent 70%)",
          bottom: "20%",
          right: "15%",
          animationDuration: "11s",
          animationDelay: "1.5s",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(42,42,69,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(42,42,69,0.2) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      <div className="relative w-full max-w-sm px-4 animate-fade-up">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo variant="primary" size={48} />
        </div>

        {/* Card */}
        <div
          className="relative p-8 rounded-2xl overflow-hidden"
          style={{
            background: "rgba(15,15,26,0.85)",
            border: "1px solid rgba(42,42,69,0.8)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 0 1px rgba(123,92,240,0.12), 0 32px 64px rgba(0,0,0,0.5), 0 0 80px rgba(123,92,240,0.08)",
          }}
        >
          {/* Card inner glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-16 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(123,92,240,0.12) 0%, transparent 80%)" }}
          />

          <h2 className="text-lg font-semibold text-hi mb-1 relative">Sign in</h2>
          <p className="text-sm text-mid mb-7 relative">AI Intelligence Platform for Fello</p>

          <form onSubmit={handleSubmit} className="space-y-5 relative">
            <div>
              <label className="block text-xs font-semibold text-lo uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                placeholder="you@fello.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-lo uppercase tracking-widest mb-2">
                Name{" "}
                <span className="text-lo/60 normal-case tracking-normal font-normal">
                  (first time only)
                </span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                placeholder="Your name"
              />
            </div>

            {error && (
              <div
                className="text-sm px-4 py-3 rounded-xl animate-fade-in"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#EF4444",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary w-full py-3 px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed relative"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-lo mt-6">
          Scryon — Automated AI Intelligence
        </p>
      </div>
    </div>
  );
}
