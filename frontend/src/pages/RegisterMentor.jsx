import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth, dashboardPath } from "../auth.jsx";

export default function RegisterMentor() {
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", password: "",
    headline: "", institution: "", bio: "", expertiseAreas: "",
    yearsExperience: 0, linkedinUrl: "", hourlyRate: 1000, monthlySubRate: "",
  });
  const [err, setErr] = useState("");

  if (!token) {
    return (
      <div className="container" style={{ maxWidth: 520 }}>
        <h2>Mentor Signup</h2>
        <p className="muted">Mentor accounts are invite-only. Ask the platform admin for an invite link.</p>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const body = {
        token, ...form,
        expertiseAreas: form.expertiseAreas.split(",").map((s) => s.trim()).filter(Boolean),
        hourlyRate: Number(form.hourlyRate),
        monthlySubRate: form.monthlySubRate ? Number(form.monthlySubRate) : null,
        yearsExperience: Number(form.yearsExperience) || 0,
      };
      await api.post("/auth/register/mentor", body);
      await refresh();
      nav(dashboardPath("mentor"));
    } catch (e) { setErr(e.response?.data?.error || "Failed"); }
  };

  return (
    <div className="container" style={{ maxWidth: 620 }}>
      <h2>Mentor Signup</h2>
      <p className="muted">Welcome! Fill in your public profile. Admin will review and activate it.</p>
      <p className="muted" style={{ fontSize: 12 }}>
        By joining, you agree not to solicit students off-platform. Any off-platform contact requests must be reported to admin.
      </p>
      <form onSubmit={submit}>
        <div className="grid2">
          <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div style={{ height: 8 }} />
        <div className="grid2">
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
        </div>
        <div style={{ height: 8 }} />
        <input placeholder='Headline — e.g. "IIT Bombay | JEE Counsellor"' value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} required />
        <div style={{ height: 8 }} />
        <div className="grid2">
          <input placeholder="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} required />
          <input placeholder="LinkedIn URL" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} />
        </div>
        <div style={{ height: 8 }} />
        <textarea rows={4} placeholder="Bio — what you help with" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} required />
        <div style={{ height: 8 }} />
        <input placeholder="Expertise areas (comma-separated)" value={form.expertiseAreas} onChange={(e) => setForm({ ...form, expertiseAreas: e.target.value })} required />
        <div style={{ height: 8 }} />
        <div className="grid3">
          <div><label>Years experience</label><input type="number" min="0" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} /></div>
          <div><label>Hourly rate (₹)</label><input type="number" min="100" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} required /></div>
          <div><label>Monthly plan (₹, optional)</label><input type="number" value={form.monthlySubRate} onChange={(e) => setForm({ ...form, monthlySubRate: e.target.value })} /></div>
        </div>
        {err && <div className="error">{err}</div>}
        <div style={{ height: 12 }} />
        <button type="submit">Create account</button>
      </form>
      <p className="muted"><Link to="/login">Already have an account?</Link></p>
    </div>
  );
}
