import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, dashboardPath } from "../auth.jsx";

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");

  if (user) { nav(dashboardPath(user.role)); return null; }

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try { await login(form.email, form.password); } catch (e) { setErr(e.response?.data?.error || "Login failed"); }
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>AssignMentor</h1>
      <p className="muted">Log in</p>
      <form onSubmit={submit}>
        <input placeholder="Email" type="email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <div style={{ height: 8 }} />
        <input placeholder="Password" type="password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {err && <div className="error">{err}</div>}
        <div style={{ height: 12 }} />
        <button type="submit">Log in</button>
      </form>
      <hr />
      <p className="muted">
        New here?
        &nbsp;<Link to="/register/client">Sign up as Client</Link>
        &nbsp;·&nbsp; <Link to="/register/doer">Sign up as Doer</Link>
        &nbsp;·&nbsp; Mentors join via admin invite link.
      </p>
      <div className="card">
        <strong>Demo accounts</strong>
        <div className="muted">admin@assignmentor.local / admin123</div>
        <div className="muted">client@demo.local / client123</div>
        <div className="muted">doer@demo.local / doer123 (approved)</div>
        <div className="muted">mentor@demo.local / mentor123 (approved)</div>
      </div>
    </div>
  );
}
