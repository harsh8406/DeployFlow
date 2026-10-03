import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sun, Moon, Monitor, RotateCw, LogOut } from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import PageTransition from "../components/PageTransition.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { fullDate } from "../utils/format.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const THEMES = [
  { key: "system", label: "System", icon: Monitor },
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
];

const Section = ({ title, description, children }) => (
  <section className="grid md:grid-cols-[220px_minmax(0,1fr)] gap-x-8 gap-y-3 py-6 border-b border-line last:border-0">
    <div>
      <h2 className="text-sm font-semibold text-fg">{title}</h2>
      {description && <p className="text-[13px] text-muted mt-1">{description}</p>}
    </div>
    <div className="min-w-0">{children}</div>
  </section>
);

const Row = ({ label, children }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5 border-b border-line last:border-0">
    <dt className="text-[13px] text-muted">{label}</dt>
    <dd className="text-sm text-fg min-w-0 break-all text-right">{children}</dd>
  </div>
);

const Settings = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [health, setHealth] = useState({ state: "checking", at: null });

  const check = useCallback(async () => {
    setHealth({ state: "checking", at: null });
    try {
      await api.get("/health");
      setHealth({ state: "ok", at: new Date() });
    } catch {
      setHealth({ state: "down", at: new Date() });
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  const statusText = { checking: "Checking...", ok: "Reachable", down: "Unreachable" }[health.state];
  const statusTone = { checking: "text-muted", ok: "text-ok", down: "text-bad" }[health.state];

  return (
    <PageTransition>
      <PageHeader title="Settings" />
      <div className="panel px-5 sm:px-6">
        <Section title="Account" description="The account you are signed in with.">
          <dl>
            <Row label="Name">{user?.name}</Row>
            <Row label="Email">{user?.email}</Row>
            <Row label="Department">{user?.department || "-"}</Row>
            <Row label="Role"><span className="capitalize">{user?.role || "-"}</span></Row>
          </dl>
        </Section>

        <Section title="Appearance" description="Applies to this browser.">
          <div role="radiogroup" aria-label="Theme" className="inline-flex p-0.5 rounded-md border border-line bg-raised/50">
            {THEMES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="radio"
                aria-checked={theme === key}
                onClick={() => setTheme(key)}
                className={`inline-flex items-center gap-2 h-8 px-3 rounded text-[13px] font-medium transition-colors ${
                  theme === key ? "bg-surface text-fg shadow-sm border border-line" : "text-muted hover:text-fg border border-transparent"
                }`}
              >
                <Icon size={14} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Backend connection" description="Where this app sends API requests.">
          <dl>
            <Row label="API endpoint"><span className="font-mono text-[13px]">{API_URL}</span></Row>
            <Row label="Status">
              <span className={`font-medium ${statusTone}`} role="status">{statusText}</span>
              {health.at && <span className="text-xs text-subtle ml-2">checked {fullDate(health.at)}</span>}
            </Row>
          </dl>
          <button onClick={check} disabled={health.state === "checking"} className="btn-secondary mt-3">
            <RotateCw size={14} className={health.state === "checking" ? "animate-spin" : ""} aria-hidden="true" /> Check again
          </button>
        </Section>

        <Section title="Notifications" description="Where run results are sent.">
          <p className="text-sm text-muted">
            Slack or Teams webhooks are set per application. Open an application and choose Edit to add one, or{" "}
            <Link to="/applications" className="text-accent hover:underline">go to applications</Link>.
          </p>
        </Section>

        <Section title="Session">
          <button onClick={() => { logout(); navigate("/login"); }} className="btn-danger">
            <LogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </Section>
      </div>
    </PageTransition>
  );
};

export default Settings;
