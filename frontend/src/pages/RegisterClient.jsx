import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth, dashboardPath } from "../auth.jsx";

export default function RegisterClient() {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await api.post("/auth/register/client", form);
      await refresh();
      nav(dashboardPath("client"));
    } catch (e) { setErr(e.response?.data?.error || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-bg" aria-hidden="true"><span className="blob" /></div>
        <div className="auth-brand-content">
          <h1>Sign up as Client</h1>
          <div className="tagline">Post assignment requirements and pay securely. Money sits in escrow until you confirm delivery.</div>
        </div>
        <div className="footnote">© CampusConnect · dev build</div>
      </aside>

      <main className="auth-form-pane">
        <div className="auth-form">
          <h2>Create client account</h2>
          <div className="sub">Takes about 30 seconds.</div>
          <form onSubmit={submit}>
            <label>Full name</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            <label>Email</label>
            <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <label>Password</label>
            <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
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
