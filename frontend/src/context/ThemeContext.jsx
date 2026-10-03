import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const mq = () => window.matchMedia("(prefers-color-scheme: dark)");

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem("theme") || "system"; } catch { return "system"; }
  });

  useEffect(() => {
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq().matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    if (theme !== "system") return;
    const m = mq();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = (next) => {
    try { localStorage.setItem("theme", next); } catch { /* storage unavailable */ }
    setThemeState(next);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};
