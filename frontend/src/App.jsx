import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import AppShell from "./components/AppShell.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Applications from "./pages/Applications.jsx";
import ApplicationDetail from "./pages/ApplicationDetail.jsx";
import Deployments from "./pages/Deployments.jsx";
import Settings from "./pages/Settings.jsx";

// Authenticated area: redirects to /login when signed out, otherwise renders inside the app shell.
const ShellLayout = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};

// Sign-in / register: signed-in users go straight to the dashboard.
const GuestLayout = () => {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route element={<GuestLayout />}>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Route>
    <Route element={<ShellLayout />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/applications" element={<Applications />} />
      <Route path="/applications/:id" element={<ApplicationDetail />} />
      <Route path="/deployments" element={<Deployments />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default App;
