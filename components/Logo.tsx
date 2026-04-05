interface LogoProps {
  variant?: "primary" | "icon" | "compact";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_PX = { sm: 24, md: 32, lg: 48 } as const;
const TEXT_CLS = { sm: "text-sm", md: "text-base", lg: "text-xl" } as const;

/**
 * Faceted octagonal lens mark.
 *
 * Seven concentric octagons alternate between two rotations (0° / 22.5°),
 * each smaller and in a lighter purple shade, converging to a near-white
 * centre point. The visible "gaps" between adjacent octagons create the
 * cut-gemstone facet effect.
 *
 * Colours outside → in: #4A3899 → #5B45B0 → #6D54C4 → #7B5CF0 →
 *                        #8B6EF5 → #9B82F8 → #B8A4FC → #F0F0FF (centre)
 *
 * ViewBox 0 0 32 32, scalable via width/height.
 */
function IconMark({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ── Layer 1 — R=15, flat-top orientation (vertex at 22.5°) ── */}
      <polygon
        points="29.9,21.7 21.7,29.9 10.3,29.9 2.1,21.7 2.1,10.3 10.3,2.1 21.7,2.1 29.9,10.3"
        fill="#4A3899"
      />

      {/* ── Layer 2 — R=11.5, rotated 22.5° (vertex at 0°) ── */}
      <polygon
        points="27.5,16 24.1,24.1 16,27.5 7.9,24.1 4.5,16 7.9,7.9 16,4.5 24.1,7.9"
        fill="#5B45B0"
      />

      {/* ── Layer 3 — R=8.5, flat-top orientation ── */}
      <polygon
        points="23.9,19.3 19.3,23.9 12.7,23.9 8.2,19.3 8.2,12.7 12.7,8.2 19.3,8.2 23.9,12.7"
        fill="#6D54C4"
      />

      {/* ── Layer 4 — R=6, rotated 22.5° ── */}
      <polygon
        points="22,16 20.2,20.2 16,22 11.8,20.2 10,16 11.8,11.8 16,10 20.2,11.8"
        fill="#7B5CF0"
      />

      {/* ── Layer 5 — R=4, flat-top orientation ── */}
      <polygon
        points="19.7,17.5 17.5,19.7 14.5,19.7 12.3,17.5 12.3,14.5 14.5,12.3 17.5,12.3 19.7,14.5"
        fill="#8B6EF5"
      />

      {/* ── Layer 6 — R=2.5, rotated 22.5° ── */}
      <polygon
        points="18.5,16 17.8,17.8 16,18.5 14.2,17.8 13.5,16 14.2,14.2 16,13.5 17.8,14.2"
        fill="#9B82F8"
      />

      {/* ── Layer 7 — R=1.5, flat-top orientation ── */}
      <polygon
        points="17.4,16.6 16.6,17.4 15.4,17.4 14.6,16.6 14.6,15.4 15.4,14.6 16.6,14.6 17.4,15.4"
        fill="#B8A4FC"
      />

      {/* ── Centre point ── */}
      <circle cx="16" cy="16" r="0.9" fill="#F0F0FF" />
    </svg>
  );
}

function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={`font-light select-none tracking-[0.15em] ${TEXT_CLS[size]}`}
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <span className="text-[#F0F0FF]">scr</span>
      <span className="text-[#A78BFA]">y</span>
      <span className="text-[#F0F0FF]">on</span>
    </span>
  );
}

export function Logo({ variant = "primary", size = "md", className = "" }: LogoProps) {
  const px = SIZE_PX[size];

  if (variant === "icon") {
    return (
      <div className={className} aria-label="Scryon">
        <IconMark px={px} />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center ${className}`} aria-label="Scryon">
        <Wordmark size={size} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label="Scryon">
      <IconMark px={px} />
      <Wordmark size={size} />
    </div>
  );
}
