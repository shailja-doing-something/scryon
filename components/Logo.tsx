interface LogoProps {
  variant?: "primary" | "icon" | "compact";
  className?: string;
  size?: number;
}

function IconMark({ size = 44 }: { size?: number }) {
  const s = size / 44;
  return (
    <svg
      width={size}
      height={Math.round(44 * s)}
      viewBox="0 0 52 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Arc gradient: bright violet at top, deep purple at bottom */}
        <linearGradient id="arc-g" x1="0.8" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="50%" stopColor="#7B5CF0" />
          <stop offset="100%" stopColor="#5B3FD4" />
        </linearGradient>

        {/* Star gradient: white center → purple edge */}
        <linearGradient id="star-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#E0D7FF" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>

        {/* Glow filter for star */}
        <filter id="star-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Soft outer glow for arc */}
        <filter id="arc-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Arc: center(22,23) r=17, gap from ~12-o'clock to ~2-o'clock (300° arc) */}
      {/* M start(top) A r r 0 large-arc sweep end(upper-right) */}
      <path
        d="M 22 6 A 17 17 0 1 1 36.7 14.5"
        fill="none"
        stroke="url(#arc-g)"
        strokeWidth="1.9"
        strokeLinecap="round"
        filter="url(#arc-glow)"
      />

      {/* 4-pointed sparkle star: center(19,23), outer r=8.5, inner r=1.3 */}
      {/* 8 points alternating outer/inner at 0°,45°,90°,135°,180°,225°,270°,315° */}
      <path
        d="
          M 19 14.5
          L 20.1 21.9
          L 27.5 23
          L 20.1 24.1
          L 19 31.5
          L 17.9 24.1
          L 10.5 23
          L 17.9 21.9
          Z
        "
        fill="url(#star-g)"
        filter="url(#star-glow)"
      />

      {/* Dot spray — radiating from right of star toward upper-right */}
      {/* Row 1 (nearest, largest) */}
      <circle cx="30"  cy="17"  r="2.2" fill="#9B87F5" opacity="0.95" />
      <circle cx="29"  cy="23"  r="1.8" fill="#8B7CF0" opacity="0.85" />
      <circle cx="30"  cy="29"  r="1.5" fill="#7B5CF0" opacity="0.65" />

      {/* Row 2 (mid) */}
      <circle cx="35"  cy="14"  r="1.6" fill="#A78BFA" opacity="0.80" />
      <circle cx="35.5" cy="20" r="1.5" fill="#9B87F5" opacity="0.70" />
      <circle cx="36"  cy="26"  r="1.2" fill="#7B5CF0" opacity="0.55" />
      <circle cx="35"  cy="32"  r="1.0" fill="#6D4FD9" opacity="0.40" />

      {/* Row 3 (far, smallest) */}
      <circle cx="40"  cy="12"  r="1.1" fill="#A78BFA" opacity="0.60" />
      <circle cx="41"  cy="18"  r="1.0" fill="#9B87F5" opacity="0.50" />
      <circle cx="41"  cy="24"  r="0.9" fill="#7B5CF0" opacity="0.38" />
      <circle cx="41"  cy="30"  r="0.7" fill="#6D4FD9" opacity="0.28" />

      {/* Tiny scattered */}
      <circle cx="45"  cy="15"  r="0.7" fill="#A78BFA" opacity="0.35" />
      <circle cx="45"  cy="22"  r="0.6" fill="#7B5CF0" opacity="0.25" />
      <circle cx="44"  cy="29"  r="0.5" fill="#7B5CF0" opacity="0.20" />
    </svg>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-bold tracking-tight select-none ${className}`}
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <span style={{ color: "#F0F0FF" }}>scry</span>
      <span
        style={{
          background: "linear-gradient(135deg, #7B5CF0, #A78BFA)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        o
      </span>
      <span style={{ color: "#F0F0FF" }}>n</span>
    </span>
  );
}

export function Logo({ variant = "primary", className = "", size }: LogoProps) {
  if (variant === "icon") {
    return (
      <div className={className} aria-label="Scryon">
        <IconMark size={size ?? 40} />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center px-4 py-2 rounded-xl ${className}`}
        style={{
          background: "#0F0F1A",
          border: "1.5px solid transparent",
          backgroundClip: "padding-box",
          boxShadow: "0 0 0 1.5px #7B5CF0, 0 0 16px rgba(123,92,240,0.25)",
        }}
        aria-label="Scryon"
      >
        <Wordmark className="text-lg" />
      </div>
    );
  }

  // primary
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label="Scryon">
      <IconMark size={size ?? 44} />
      <Wordmark className="text-xl" />
    </div>
  );
}
