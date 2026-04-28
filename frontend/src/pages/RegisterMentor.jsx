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
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
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
    finally { setBusy(false); }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-bg" aria-hidden="true"><span className="blob" /></div>
        <div className="auth-brand-content">
          <h1>Mentor signup</h1>
          <div className="tagline">
            {token
              ? "Welcome! Fill in your public profile. Admin will review and activate your account."
              : "Mentor accounts are invite-only. Ask the platform admin for an invite link."}
          </div>
          {token && (
            <div className="pillar-list">
              <div className="pillar"><div className="pillar-num">⚖️</div><div>By joining you agree not to solicit students off-platform. Off-platform contact requests must be reported to admin.</div></div>
            </div>
          )}
        </div>
        <div className="footnote">© CampusConnect · dev build</div>
      </aside>

      <main className="auth-form-pane">
        <div className="auth-form" style={{ maxWidth: 600 }}>
          {!token ? (
            <>
              <h2>Invite required</h2>
              <div className="sub">Reach out to the admin to receive your invite link.</div>
              <div style={{ marginTop: 16 }}>
                <Link to="/login" className="muted">← Back to sign in</Link>
              </div>
            </>
          ) : (
            <>
              <h2>Create mentor account</h2>
              <div className="sub">Your profile becomes public after admin approval.</div>
              <form onSubmit={submit}>
                <div className="grid2">
                  <div><label>Full name</label><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
                  <div><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                </div>
                <div className="grid2">
                  <div><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><label>Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
                </div>
                <label>Headline</label>
                <input placeholder='e.g. "IIT Bombay | JEE Counsellor"' value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} required />
                <div className="grid2">
                  <div><label>Institution</label><input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} required /></div>
                  <div><label>LinkedIn URL</label><input value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} /></div>
                </div>
                <label>Bio</label>
                <textarea rows={4} placeholder="What do you help students with?" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} required />
                <label>Expertise areas <span className="muted">(comma-separated)</span></label>
                <input value={form.expertiseAreas} onChange={(e) => setForm({ ...form, expertiseAreas: e.target.value })} required />
                <div className="grid3">
                  <div><label>Years experience</label><input type="number" min="0" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} /></div>
                  <div><label>Hourly rate (₹)</label><input type="number" min="100" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} required /></div>
                  <div><label>Monthly plan (₹)</label><input type="number" placeholder="optional" value={form.monthlySubRate} onChange={(e) => setForm({ ...form, monthlySubRate: e.target.value })} /></div>
                </div>
                {err && <div className="error">{err}</div>}
                <div style={{ height: 14 }} />
                <button type="submit" className="lg" style={{ width: "100%" }} disabled={busy}>
                  {busy ? <><span className="spinner" /> Creating…</> : "Create account"}
                </button>
              </form>
              <div className="auth-divider">or</div>
              <Link to="/login" className="muted">Sign in instead</Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
