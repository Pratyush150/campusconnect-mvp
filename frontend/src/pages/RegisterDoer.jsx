import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth, dashboardPath } from "../auth.jsx";

export default function RegisterDoer() {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", skills: "", bio: "", education: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const body = { ...form, skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean) };
      await api.post("/auth/register/doer", body);
      await refresh();
      nav(dashboardPath("doer"));
    } catch (e) { setErr(e.response?.data?.error || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-bg" aria-hidden="true"><span className="blob" /></div>
        <div className="auth-brand-content">
          <h1>Sign up as Doer</h1>
          <div className="tagline">Bid on assignments and deliver work. Profile is reviewed by admin before you can place bids.</div>
        </div>
        <div className="footnote">© CampusConnect · dev build</div>
      </aside>

      <main className="auth-form-pane">
        <div className="auth-form" style={{ maxWidth: 480 }}>
          <h2>Create doer account</h2>
          <div className="sub">Tell us what you can do.</div>
          <form onSubmit={submit}>
            <label>Full name</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            <div className="grid2" style={{ marginTop: 8 }}>
              <div>
                <label>Email</label>
                <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <label>Password</label>
            <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            <label>Skills <span className="muted">(comma-separated)</span></label>
            <input value={form.skills} placeholder="python, essay_writing, mathematics" onChange={(e) => setForm({ ...form, skills: e.target.value })} required />
            <label>Education</label>
            <input value={form.education} placeholder="e.g. BTech CS, IIT Kanpur" onChange={(e) => setForm({ ...form, education: e.target.value })} />
            <label>Short bio</label>
            <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            {err && <div className="error">{err}</div>}
            <div style={{ height: 14 }} />
            <button type="submit" className="lg" style={{ width: "100%" }} disabled={busy}>
              {busy ? <><span className="spinner" /> Creating…</> : "Create account"}
            </button>
          </form>
          <div className="auth-divider">or</div>
          <div className="row-tight" style={{ justifyContent: "space-between" }}>
            <Link to="/register" className="muted">← Pick a different role</Link>
            <Link to="/login" className="muted">Sign in instead</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
