import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import AuthLayout from "../components/AuthLayout.jsx";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password, department.trim() || undefined);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request ? "Cannot reach the server. Check your connection and try again." : "Registration failed. Please try again.")
      );
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Connect a repository and run your first pipeline in minutes."
      footer={<>Already registered? <Link to="/login" className="text-accent font-medium hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-md border border-bad/30 bg-bad/10 text-sm text-bad">
            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
          </div>
        )}
        <div>
          <label htmlFor="name" className="field-label">Full name</label>
          <input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
        </div>
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="input-field" />
        </div>
        <div>
          <label htmlFor="department" className="field-label">Department</label>
          <input id="department" autoComplete="organization-title" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Platform Engineering" className="input-field" />
          <p className="field-hint">Optional.</p>
        </div>
        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <input id="password" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" />
          <p className="field-hint">At least 6 characters.</p>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Register;
