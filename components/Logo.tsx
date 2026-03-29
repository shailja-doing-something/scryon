interface LogoProps {
  variant?: "primary" | "icon" | "compact";
  className?: string;
}

export function Logo({ variant = "primary", className = "" }: LogoProps) {
  if (variant === "icon") {
    return (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Scryon"
      >
        <defs>
          <linearGradient id="logo-grad-icon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7B5CF0" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        {/* Hexagon background */}
        <path
          d="M16 2L28.12 9V23L16 30L3.88 23V9L16 2Z"
          fill="url(#logo-grad-icon)"
        />
        {/* S letterform */}
        <path
          d="M20.5 11.5C20.5 10.12 19.38 9 18 9H14C12.34 9 11 10.34 11 12C11 13.66 12.34 15 14 15H18C19.66 15 21 16.34 21 18C21 19.66 19.66 21 18 21H14C12.62 21 11.5 19.88 11.5 18.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Logo variant="icon" />
        <span
          className="text-base font-bold tracking-tight"
          style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
        >
          Scryon
        </span>
      </div>
    );
  }

  // primary
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logo-grad-primary" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7B5CF0" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        <path
          d="M16 2L28.12 9V23L16 30L3.88 23V9L16 2Z"
          fill="url(#logo-grad-primary)"
        />
        <path
          d="M20.5 11.5C20.5 10.12 19.38 9 18 9H14C12.34 9 11 10.34 11 12C11 13.66 12.34 15 14 15H18C19.66 15 21 16.34 21 18C21 19.66 19.66 21 18 21H14C12.62 21 11.5 19.88 11.5 18.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <div>
        <p
          className="text-xl font-bold tracking-tight leading-none"
          style={{ background: "linear-gradient(135deg, #7B5CF0, #A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
        >
          Scryon
        </p>
        <p className="text-[10px] text-mid tracking-widest uppercase mt-0.5">
          AI Intelligence
        </p>
      </div>
    </div>
  );
}
