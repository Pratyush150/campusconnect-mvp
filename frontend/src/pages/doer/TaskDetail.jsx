import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api.js";

export default function TaskDetail() {
  const { id } = useParams();
  const fileInput = useRef();
  const [t, setT] = useState(null);
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState("");

  const load = () => {
    api.get("/assignments/my-tasks").then((r) => {
      const x = r.data.tasks.find((x) => x.id === id);
      setT(x);
    });
    api.get(`/messages/${id}`).then((r) => setMsgs(r.data.messages));
  };
  useEffect(() => { load(); }, [id]);

  if (!t) return <div className="container muted">Loading…</div>;

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!fileInput.current?.files?.length) { setErr("Select at least one file"); return; }
    const fd = new FormData();
    for (const f of fileInput.current.files) fd.append("files", f);
    try {
      const up = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await api.post(`/assignments/${t.id}/deliver`, { files: up.data.files, doerNotes: notes });
      setMsg("Delivered. Awaiting admin review.");
      setNotes("");
      load();
    } catch (e) { setErr(e.response?.data?.error || "Upload failed"); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await api.post("/messages/send", { assignmentId: t.id, message: draft });
    setDraft("");
    load();
  };

  return (
    <div className="container" style={{ maxWidth: 780 }}>
      <Link to="/doer" className="muted">← Back</Link>
      <div className="card">
        <span className={`tag ${t.status}`}>{t.status}</span>
        <h2>{t.title}</h2>
        <div className="muted">Deadline {new Date(t.deadline).toLocaleString()} · ₹{t.finalPrice}</div>
        <p>{t.description}</p>
      </div>

      <div className="card">
        <h3>Deliveries</h3>
        {t.deliveries.map((d) => (
          <div key={d.id} style={{ marginBottom: 8 }}>
            <span className={`tag ${d.adminReview === "approved" ? "delivered" : d.adminReview === "revision_needed" ? "revision" : "pending"}`}>{d.adminReview}</span>
            <strong>v{d.version}</strong>
            <ul>{d.files.map((f, i) => <li key={i}><a href={f.url} target="_blank" rel="noreferrer">{f.filename}</a></li>)}</ul>
            {d.adminFeedback && <div className="muted">Feedback: {d.adminFeedback}</div>}
          </div>
        ))}

        {["in_progress", "revision"].includes(t.status) && (
          <form onSubmit={submit} style={{ marginTop: 12 }}>
            <label>Upload files</label>
            <input type="file" multiple ref={fileInput} />
            <div style={{ height: 8 }} />
            <label>Notes for admin</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            {err && <div className="error">{err}</div>}
            {msg && <div className="ok">{msg}</div>}
            <div style={{ height: 12 }} />
            <button type="submit">Submit delivery</button>
          </form>
        )}
      </div>

      <div className="card">
        <h3>Message admin</h3>
        <form onSubmit={sendMessage}>
          <textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div style={{ height: 8 }} />
          <button type="submit">Send</button>
        </form>
        <hr />
        {msgs.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <div className="muted" style={{ fontSize: 11 }}>{m.fromAdmin ? "Admin" : "You"} · {new Date(m.createdAt).toLocaleString()}</div>
            <div>{m.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
