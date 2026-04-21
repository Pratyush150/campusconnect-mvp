import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth, dashboardPath } from "../auth.jsx";

export default function RegisterClient() {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/auth/register/client", form);
      await refresh();
      nav(dashboardPath("client"));
    } catch (e) { setErr(e.response?.data?.error || "Failed"); }
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h2>Sign up as Client</h2>
      <p className="muted">You'll post assignment requirements and pay securely.</p>
      <form onSubmit={submit}>
        <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        <div style={{ height: 8 }} />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <div style={{ height: 8 }} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div style={{ height: 8 }} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
        {err && <div className="error">{err}</div>}
        <div style={{ height: 12 }} />
        <button type="submit">Create account</button>
      </form>
      <p className="muted"><Link to="/login">Already have an account?</Link></p>
    </div>
  );
}
