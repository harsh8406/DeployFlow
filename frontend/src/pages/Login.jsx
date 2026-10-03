import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import AuthLayout from "../components/AuthLayout.jsx";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request ? "Cannot reach the server. Check your connection and try again." : "Sign in failed. Please try again.")
      );
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to DeployFlow"
      subtitle="Use your account to manage applications and deployments."
      footer={<>No account? <Link to="/register" className="text-accent font-medium hover:underline">Create one</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-md border border-bad/30 bg-bad/10 text-sm text-bad">
            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
          </div>
        )}
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="input-field" />
        </div>
        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;
