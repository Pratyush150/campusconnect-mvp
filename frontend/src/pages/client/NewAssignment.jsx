import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api.js";
import { useToast } from "../../toast.jsx";

export default function NewAssignment() {
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    title: "", description: "", subject: "", assignmentType: "homework",
    deadline: defaultDeadline(), budgetMin: "", budgetMax: "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        ...form,
        deadline: new Date(form.deadline).toISOString(),
        budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
      };
      const r = await api.post("/assignments/request", body);
      toast.success("Submitted for admin review.");
      nav(`/client/assignments/${r.data.assignment.id}`);
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <Link to="/client" className="muted">← My assignments</Link>
      <div className="page-head" style={{ marginTop: 6 }}>
        <div>
          <h2>Post a requirement</h2>
          <div className="page-sub">Admin reviews and anonymizes before doers see it.</div>
        </div>
      </div>
      <div className="card">
        <form onSubmit={submit}>
          <label className="required">Title</label>
          <input value={form.title} placeholder="e.g. 1500-word essay on game theory" onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <label className="required">Description</label>
          <textarea rows={6} placeholder="What needs to be done? Word count, format, references…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <div className="grid2">
            <div>
              <label>Subject</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label>Type</label>
              <select value={form.assignmentType} onChange={(e) => setForm({ ...form, assignmentType: e.target.value })}>
                {["homework", "project", "thesis", "lab_report", "essay", "code", "other"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <label className="required">Deadline</label>
          <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
          <div className="grid2">
            <div>
              <label>Budget min (₹)</label>
              <input type="number" min="0" value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} />
            </div>
            <div>
              <label>Budget max (₹)</label>
              <input type="number" min="0" value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} />
            </div>
          </div>
          <div className="muted" style={{ marginTop: 10 }}>
            Don't include phone, email, or messaging handles — the platform flags them to admin automatically.
          </div>
          <div style={{ height: 14 }} />
          <button type="submit" disabled={busy}>
            {busy ? <><span className="spinner" /> Submitting…</> : "Submit for review"}
          </button>
        </form>
      </div>
    </div>
  );
}

function defaultDeadline() {
  const d = new Date(Date.now() + 3 * 86400 * 1000);
  return d.toISOString().slice(0, 16);
}
