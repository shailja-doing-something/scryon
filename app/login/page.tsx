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

    const result = await signIn("credentials", {
      email: email.trim(),
      name: name.trim(),
      redirect: false,
    });

    if (result?.error) {
      setError("Sign in failed. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-canvas"
      style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(123, 92, 240, 0.12) 0%, #080810 60%)" }}
    >
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo variant="primary" />
        </div>

        {/* Card */}
        <div className="bg-surface border border-rim rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-hi mb-1">Sign in</h2>
          <p className="text-sm text-mid mb-6">AI Intelligence Platform for Fello</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-mid mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-elevated border border-rim rounded-lg text-sm text-hi placeholder-lo focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                placeholder="you@fello.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-mid mb-2 uppercase tracking-wider">
                Name{" "}
                <span className="text-lo normal-case tracking-normal font-normal">
                  (first time only)
                </span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-elevated border border-rim rounded-lg text-sm text-hi placeholder-lo focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                placeholder="Your name"
              />
            </div>

            {error && (
              <p className="text-sm text-err bg-err/10 border border-err/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
