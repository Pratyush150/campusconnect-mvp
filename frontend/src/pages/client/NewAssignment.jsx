import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api.js";
import { useToast } from "../../toast.jsx";

export default function NewAssignment() {
  const nav = useNavigate();
  const toast = useToast();
  const fileInput = useRef();
  const [form, setForm] = useState({
    title: "", description: "", subject: "", assignmentType: "homework",
    deadline: defaultDeadline(),
    budgetMin: "", budgetMax: "",
    isHandwritten: false, handwrittenExtra: "",
  });
  const [attached, setAttached] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    try {
      const r = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAttached((prev) => [...prev, ...r.data.files]);
      toast.success(`${r.data.files.length} file${r.data.files.length === 1 ? "" : "s"} attached`);
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) { toast.error(e.response?.data?.error || "Upload failed"); }
    finally { setUploading(false); }
  };

  const removeFile = (idx) => setAttached((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.budgetMax) { toast.error("Maximum budget is required"); return; }
    if (form.isHandwritten && !form.handwrittenExtra) {
      toast.error("Specify the extra notes charge for handwritten work"); return;
    }
    setBusy(true);
    try {
      const body = {
        ...form,
        deadline: new Date(form.deadline).toISOString(),
        budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
        budgetMax: Number(form.budgetMax),
        handwrittenExtra: form.handwrittenExtra ? Number(form.handwrittenExtra) : null,
        attachments: attached,
      };
      const r = await api.post("/assignments/request", body);
      toast.success("Submitted for admin review.");
      nav(`/client/assignments/${r.data.assignment.id}`);
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="container" style={{ maxWidth: 760 }}>
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
              <input type="number" min="0" placeholder="optional" value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} />
            </div>
            <div>
              <label className="required">Budget max (₹)</label>
              <input type="number" min="100" placeholder="e.g. 1500" value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} required />
            </div>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: -4 }}>
            Doers won't bid above your max. You'll only see bids that fit your range.
          </div>

          {/* Handwritten toggle */}
          <div style={{ marginTop: 16, padding: 14, border: "1px solid var(--border)", borderRadius: 10, background: "var(--panel-2)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, textTransform: "none", letterSpacing: 0, fontSize: 14, marginBottom: 0, cursor: "pointer" }}>
              <input
                type="checkbox" style={{ width: "auto", margin: 0 }}
                checked={form.isHandwritten}
                onChange={(e) => setForm({ ...form, isHandwritten: e.target.checked, handwrittenExtra: e.target.checked ? form.handwrittenExtra : "" })}
              />
              <span><strong>This is handwritten work</strong> — paper notes, copies etc.</span>
            </label>
            {form.isHandwritten && (
              <div style={{ marginTop: 10 }}>
                <label className="required">Extra notes / paper charge (₹)</label>
                <input type="number" min="0" placeholder="e.g. 200" value={form.handwrittenExtra}
                       onChange={(e) => setForm({ ...form, handwrittenExtra: e.target.value })} required />
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  This is an upfront supplement on top of the bid — covers paper, photographs, courier etc. Doers see it before bidding.
                </div>
              </div>
            )}
          </div>

          {/* File upload */}
          <div style={{ marginTop: 16 }}>
            <label>Attachments <span className="muted">(reference materials, brief, syllabus — up to 10 files, 10 MB each)</span></label>
            <input type="file" multiple ref={fileInput} onChange={handleUpload} />
            {uploading && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}><span className="spinner" /> Uploading…</div>}
            {attached.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                {attached.map((f, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <a href={f.url} target="_blank" rel="noreferrer">{f.filename}</a>
                    <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>{Math.round(f.size / 1024)} KB</span>
                    <button type="button" className="link xs" style={{ marginLeft: 8 }} onClick={() => removeFile(i)}>remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
            Don't include phone, email, or messaging handles — the platform flags them to admin automatically.
          </div>
          <div style={{ height: 14 }} />
          <button type="submit" disabled={busy || uploading}>
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
