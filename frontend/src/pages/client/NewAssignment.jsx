import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api.js";

export default function NewAssignment() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", subject: "", assignmentType: "homework",
    deadline: defaultDeadline(), budgetMin: "", budgetMax: "",
  });
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const body = {
        ...form,
        deadline: new Date(form.deadline).toISOString(),
        budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
      };
      const r = await api.post("/assignments/request", body);
      nav(`/client/assignments/${r.data.assignment.id}`);
    } catch (e) { setErr(e.response?.data?.error || "Failed"); }
  };

  return (
    <div className="container" style={{ maxWidth: 620 }}>
      <h2>Post assignment requirement</h2>
      <form onSubmit={submit}>
        <label>Title</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <div style={{ height: 8 }} />
        <label>Description</label>
        <textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <div style={{ height: 8 }} />
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
        <div style={{ height: 8 }} />
        <label>Deadline</label>
        <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
        <div style={{ height: 8 }} />
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
          Do not include your phone, email, or messaging handles in the description — the platform scans for these and flags them to admin.
        </div>
        {err && <div className="error">{err}</div>}
        <div style={{ height: 12 }} />
        <button type="submit">Submit for review</button>
      </form>
    </div>
  );
}

function defaultDeadline() {
  const d = new Date(Date.now() + 3 * 86400 * 1000);
  return d.toISOString().slice(0, 16);
}
