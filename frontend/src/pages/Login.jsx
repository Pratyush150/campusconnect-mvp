import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, dashboardPath } from "../auth.jsx";

const ROLES = [
  { key: "client", label: "Client",  tagline: "I need an assignment done",    demo: { email: "client@demo.local",           password: "client123" }, signup: "/register/client" },
  { key: "doer",   label: "Doer",    tagline: "I want to do assignments",     demo: { email: "doer@demo.local",             password: "doer123" },   signup: "/register/doer" },
  { key: "mentor", label: "Mentor",  tagline: "I mentor students (paid)",     demo: { email: "mentor@demo.local",           password: "mentor123" }, signup: "/register/mentor", signupNote: "invite-only — ask admin" },
  { key: "admin",  label: "Admin",   tagline: "Platform operator",            demo: { email: "admin@assignmentor.local",    password: "admin123" },  signup: null },
];

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState("client");
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) { nav(dashboardPath(user.role)); return null; }

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

  const fillDemo = () => setForm({ ...current.demo });

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1 style={{ marginBottom: 4 }}>AssignMentor</h1>
      <p className="muted" style={{ marginTop: 0 }}>Choose who you are — same form, clearer signup & demo creds.</p>

      <div className="role-tabs">
        {ROLES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRole(r.key)}
            className={role === r.key ? "role-tab active" : "role-tab"}
          >
            <span className="role-tab-label">{r.label}</span>
            <span className="role-tab-tag muted">{r.tagline}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="card">
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <div style={{ height: 8 }} />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {err && <div className="error">{err}</div>}
        <div style={{ height: 12 }} />
        <div className="row" style={{ maxWidth: 360 }}>
          <button type="submit" disabled={busy}>{busy ? "Logging in…" : `Log in as ${current.label}`}</button>
          <button type="button" className="secondary" onClick={fillDemo} style={{ maxWidth: 160 }}>Use demo creds</button>
        </div>
        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Demo: <code>{current.demo.email}</code> / <code>{current.demo.password}</code>
        </div>
      </form>

      <div className="card">
        <strong>New to AssignMentor?</strong>
        <div className="muted" style={{ marginBottom: 6 }}>Separate signup for each role:</div>
        <div className="row" style={{ flexWrap: "wrap", gap: 6, maxWidth: 520 }}>
          {ROLES.map((r) => r.signup ? (
            <Link key={r.key} to={r.signup} style={{ flex: "1 0 140px" }}>
              <button className={r.key === role ? "" : "secondary"} type="button" style={{ width: "100%" }}>
                Sign up as {r.label}
              </button>
            </Link>
          ) : null)}
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Mentors are invite-only. Admin signup is not public — one admin is seeded.
        </div>
      </div>
    </div>
  );
}
