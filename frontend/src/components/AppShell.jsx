import React, { useEffect, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Boxes, Rocket, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "./Logo.jsx";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/applications", label: "Applications", icon: Boxes },
  { to: "/deployments", label: "Deployments", icon: Rocket },
  { to: "/settings", label: "Settings", icon: Settings },
];

const SidebarContent = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex flex-col h-full">
      <Link to="/dashboard" onClick={onNavigate} className="h-14 px-4 flex items-center border-b border-line">
        <Logo />
      </Link>
      <nav aria-label="Primary" className="flex-1 p-2 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to} onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-raised text-fg" : "text-muted hover:text-fg hover:bg-raised/60"
              }`
            }
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-2 border-t border-line">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <span className="w-7 h-7 rounded-md bg-raised border border-line text-xs font-semibold text-muted flex items-center justify-center shrink-0" aria-hidden="true">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-fg truncate">{user?.name}</p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="btn-icon w-8 h-8" aria-label="Sign out" title="Sign out"
          >
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

const AppShell = ({ children }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-[100dvh]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn-primary">
        Skip to content
      </a>

      <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 bg-surface border-r border-line">
        <SidebarContent />
      </aside>

      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-surface border-b border-line">
        <Logo />
        <button onClick={() => setOpen(true)} className="btn-icon -mr-2" aria-label="Open navigation" aria-expanded={open}>
          <Menu size={18} aria-hidden="true" />
        </button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-surface border-r border-line" role="dialog" aria-modal="true" aria-label="Navigation">
            <button onClick={() => setOpen(false)} className="btn-icon absolute top-2.5 right-2" aria-label="Close navigation">
              <X size={16} aria-hidden="true" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main id="main" tabIndex={-1} className="lg:pl-60 focus:outline-none">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
};

export default AppShell;
