import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function NewService() {
  const nav = useNavigate();
  const [form, setForm] = useState({ kind: "REQUEST", title: "", description: "", tags: "" });
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const r = await api.post("/services", form);
      nav(`/services/${r.data.service.id}`);
    } catch (e) {
      setErr(e.response?.data?.error || "Failed");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h2>Post a service</h2>
      <form onSubmit={submit}>
        <label className="muted">Type</label>
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          <option value="REQUEST">Request — I need help</option>
          <option value="OFFER">Offer — I can help</option>
        </select>
        <div style={{ height: 8 }} />
        <label className="muted">Title</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <div style={{ height: 8 }} />
        <label className="muted">Description</label>
        <textarea rows={5} value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <div style={{ height: 8 }} />
        <label className="muted">Tags (comma-separated)</label>
        <input placeholder="DSA, Trees, Java" value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        {err && <div className="error">{err}</div>}
        <div style={{ height: 12 }} />
        <button type="submit">Post</button>
      </form>
    </div>
  );
}
