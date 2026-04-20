import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { login, signup, user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", college: "" });
  const [err, setErr] = useState("");

  if (user) { nav("/feed"); return null; }

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      if (mode === "login") await login(form.email, form.password);
      else await signup(form);
      nav("/feed");
    } catch (e) {
      setErr(e.response?.data?.error || "Request failed");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>CampusConnect</h1>
      <p className="muted">{mode === "login" ? "Log in" : "Create an account"}</p>
      <form onSubmit={onSubmit}>
        {mode === "signup" && (
          <>
            <input placeholder="Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div style={{ height: 8 }} />
            <input placeholder="College" value={form.college}
              onChange={(e) => setForm({ ...form, college: e.target.value })} />
            <div style={{ height: 8 }} />
          </>
        )}
        <input placeholder="Email" type="email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <div style={{ height: 8 }} />
        <input placeholder="Password" type="password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {err && <div className="error">{err}</div>}
        <div style={{ height: 12 }} />
        <button type="submit">{mode === "login" ? "Log in" : "Sign up"}</button>
        <button type="button" className="secondary" style={{ marginLeft: 8 }}
          onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Create account" : "Have an account?"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>
        Seeded demo users: <code>alice@campus.edu</code> / <code>bob@campus.edu</code> (password <code>password123</code>)
      </p>
    </div>
  );
}
