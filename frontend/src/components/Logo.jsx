import React from "react";

export const LogoMark = ({ size = 28 }) => (
  <span
    className="rounded-md bg-accent text-accent-fg flex items-center justify-center shrink-0"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3v10M4 3h4.5a3.5 3.5 0 010 7H4" />
    </svg>
  </span>
);

const Logo = () => (
  <span className="flex items-center gap-2.5">
    <LogoMark />
    <span className="font-semibold text-[15px] text-fg tracking-tight">DeployFlow</span>
  </span>
);

export default Logo;
