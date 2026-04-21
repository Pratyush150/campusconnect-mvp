import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth, dashboardPath } from "../auth.jsx";

export default function RegisterDoer() {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", skills: "", bio: "", education: "" });
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const body = { ...form, skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean) };
      await api.post("/auth/register/doer", body);
      await refresh();
      nav(dashboardPath("doer"));
    } catch (e) { setErr(e.response?.data?.error || "Failed"); }
  };

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h2>Sign up as Doer</h2>
      <p className="muted">Bid on assignments. Admin must approve your profile before you can bid.</p>
      <form onSubmit={submit}>
        <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        <div style={{ height: 8 }} />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <div style={{ height: 8 }} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div style={{ height: 8 }} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
        <div style={{ height: 8 }} />
        <input placeholder="Skills (comma-separated)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} required />
        <div style={{ height: 8 }} />
        <input placeholder="Education (e.g. BTech CS, IIT Kanpur)" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
        <div style={{ height: 8 }} />
        <textarea rows={3} placeholder="Short bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        {err && <div className="error">{err}</div>}
        <div style={{ height: 12 }} />
        <button type="submit">Create account</button>
      </form>
      <p className="muted"><Link to="/login">Already have an account?</Link></p>
    </div>
  );
}
