import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth, dashboardPath } from "../auth.jsx";

const ROLES = [
  { key: "client", label: "Client", demo: { email: "client@demo.local",          password: "client123" } },
  { key: "doer",   label: "Doer",   demo: { email: "doer@demo.local",            password: "doer123"   } },
  { key: "mentor", label: "Mentor", demo: { email: "mentor@demo.local",          password: "mentor123" } },
  { key: "admin",  label: "Admin",  demo: { email: "admin@campusconnect.local",  password: "admin123"  } },
];

export default function Login() {
  const { login, user, loading } = useAuth();
  const [role, setRole] = useState("client");
  const [form, setForm] = useState({ email: "", password: "" });
  const [showDemo, setShowDemo] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="center">Loading…</div>;
  if (user) return <Navigate to={dashboardPath(user.role)} replace />;

  const current = ROLES.find((r) => r.key === role);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await login(form.email, form.password);
    } catch (e) {
      setErr(e.response?.data?.error || "Login failed");
    } finally { setBusy(false); }
  };

  const fillDemo = () => { setForm({ ...current.demo }); setShowDemo(true); };

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-bg" aria-hidden="true"><span className="blob" /></div>
        <div className="auth-brand-content">
          <h1>CampusConnect</h1>
          <div className="tagline">
            A two-channel platform — assignment marketplace plus paid mentorship — built so the people transacting can never cut us out.
          </div>
          <div className="pillar-list">
            <div className="pillar"><div className="pillar-num">1</div><div><strong>Escrow-first.</strong> Money sits with the platform until you confirm the work.</div></div>
            <div className="pillar"><div className="pillar-num">2</div><div><strong>Admin gateway.</strong> Clients and Doers never message directly — every handoff goes through us.</div></div>
            <div className="pillar"><div className="pillar-num">3</div><div><strong>Verified mentors.</strong> Slot booking, paid sessions, platform-issued meeting links.</div></div>
          </div>
        </div>
        <div className="footnote">© CampusConnect · dev build</div>
      </aside>

      <main className="auth-form-pane">
        <div className="auth-form">
          <h2>Welcome back</h2>
          <div className="sub">Sign in to your account.</div>

          <label style={{ marginTop: 4 }}>I am a</label>
          <div className="segmented full" role="tablist" aria-label="Role">
            {ROLES.map((r) => (
              <button
                key={r.key} type="button"
                onClick={() => setRole(r.key)}
                className={role === r.key ? "active" : ""}
                aria-selected={role === r.key}
              >{r.label}</button>
            ))}
          </div>

          <form onSubmit={submit} style={{ marginTop: 14 }}>
            <label>Email</label>
            <input type="email" autoComplete="email" value={form.email}
                   onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <label>Password</label>
            <input type="password" autoComplete="current-password" value={form.password}
                   onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            {err && <div className="error">{err}</div>}
            <div style={{ height: 14 }} />
            <button type="submit" className="lg" style={{ width: "100%" }} disabled={busy}>
              {busy ? <><span className="spinner" /> Signing in…</> : `Sign in as ${current.label}`}
            </button>
          </form>

          <div className="auth-divider">or</div>
          <div className="row-tight" style={{ justifyContent: "space-between" }}>
            <button type="button" className="link" onClick={fillDemo}>Use demo credentials</button>
            <Link to="/register" className="muted">New here? Create account →</Link>
          </div>
          {showDemo && (
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Demo: <code>{current.demo.email}</code> / <code>{current.demo.password}</code>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
