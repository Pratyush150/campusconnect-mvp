import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api.js";
import { useToast, usePrompt } from "../../toast.jsx";
import Timeline from "../../components/Timeline.jsx";
import { deadlineMeta, relativeTime } from "../../lib/assignmentStatus.js";

export default function TaskDetail() {
  const { id } = useParams();
  const toast = useToast();
  const prompt = usePrompt();
  const fileInput = useRef();
  const [t, setT] = useState(null);
  const [notes, setNotes] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [progress, setProgress] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressForm, setProgressForm] = useState({ pct: 50, note: "" });

  const load = () => {
    api.get("/assignments/my-tasks").then((r) => {
      const x = r.data.tasks.find((x) => x.id === id);
      setT(x);
    });
    api.get(`/messages/${id}`).then((r) => setMsgs(r.data.messages));
    api.get(`/assignments/${id}/progress`).then((r) => setProgress(r.data.progress)).catch(() => {});
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!t) return <div className="container muted">Loading…</div>;

  const dl = deadlineMeta(t.deadline);
  const latestPct = progress[0]?.percentComplete;

  const submit = async (e) => {
    e.preventDefault();
    if (!fileInput.current?.files?.length) { toast.error("Select at least one file"); return; }
    setBusy(true);
    const fd = new FormData();
    for (const f of fileInput.current.files) fd.append("files", f);
    try {
      const up = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await api.post(`/assignments/${t.id}/deliver`, { files: up.data.files, doerNotes: notes });
      toast.success("Delivered. Awaiting admin review.");
      setNotes("");
      if (fileInput.current) fileInput.current.value = "";
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Upload failed"); }
    finally { setBusy(false); }
  };

  const postProgress = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/assignments/${t.id}/progress-update`, {
        percentComplete: Number(progressForm.pct),
        note: progressForm.note || null,
      });
      toast.success("Progress logged.");
      setShowProgressForm(false);
      setProgressForm({ pct: 50, note: "" });
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
    finally { setBusy(false); }
  };

  const askDoubt = async () => {
    const q = await prompt({
      title: "Ask a doubt about this assignment",
      label: "Admin will relay your question to the client. Don't include contact info.",
      multiline: true, confirmLabel: "Send to admin",
    });
    if (!q) return;
    try {
      await api.post("/messages/send", { assignmentId: t.id, message: q, messageType: "doubt" });
      toast.success("Doubt sent to admin.");
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await api.post("/messages/send", { assignmentId: t.id, message: draft });
    setDraft("");
    load();
  };

  const canPostProgress = ["assigned", "in_progress", "review", "revision"].includes(t.status);

  return (
    <div className="container" style={{ maxWidth: 880 }}>
      <Link to="/doer" className="muted">← Back</Link>

      <div className="card" style={{ marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className={`tag ${t.status}`}>{t.status}</span>
          {t.clientPaid && <span className="tag completed">paid</span>}
        </div>
        <h2 style={{ marginBottom: 2 }}>{t.title}</h2>
        <Timeline assignment={t} />
        <div className="meta-row">
          <span className="meta-item">📅 Deadline {new Date(t.deadline).toLocaleString()}</span>
          {dl && <span className={`meta-item ${dl.tone || ""}`}>⏰ {dl.label}</span>}
          <span className="meta-item">💰 ₹{t.finalPrice}</span>
          {latestPct != null && <span className="meta-item">📊 {latestPct}%</span>}
        </div>
        <p style={{ marginTop: 12 }}>{t.description}</p>

        {canPostProgress && (
          <div className="row" style={{ flexWrap: "wrap", marginTop: 12 }}>
            <button className="outline" onClick={() => setShowProgressForm((s) => !s)}>
              {showProgressForm ? "Cancel" : "📊 Update progress"}
            </button>
            <button className="outline" onClick={askDoubt}>❓ Ask a doubt</button>
          </div>
        )}

        {showProgressForm && (
          <form onSubmit={postProgress} style={{ marginTop: 14, padding: 14, background: "var(--panel-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <label>Progress: {progressForm.pct}%</label>
            <input type="range" min="0" max="100" step="5" value={progressForm.pct}
                   onChange={(e) => setProgressForm({ ...progressForm, pct: e.target.value })} />
            <label>Note for the client (optional)</label>
            <textarea rows={2} placeholder="e.g. finished section 1, drafting 2 next." value={progressForm.note}
                      onChange={(e) => setProgressForm({ ...progressForm, note: e.target.value })} />
            <div style={{ height: 8 }} />
            <button type="submit" disabled={busy}>{busy ? <><span className="spinner" /> Posting…</> : "Post update"}</button>
          </form>
        )}
      </div>

      <div className="card">
        <h3>Progress log</h3>
        {progress.length === 0 && <div className="muted">No updates yet — drop one above to keep the client in the loop.</div>}
        {progress.length > 0 && (
          <div className="progress-list">
            {progress.map((p) => (
              <div key={p.id} className="progress-item">
                <div className="progress-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                    <span className="progress-pct">{p.percentComplete}%</span>
                    <div className="progress" style={{ flex: 1, maxWidth: 220 }}>
                      <div className="progress-fill" style={{ width: `${p.percentComplete}%` }} />
                    </div>
                  </div>
                  <span className="progress-time">{relativeTime(p.createdAt)}</span>
                </div>
                {p.note && <div className="progress-note">{p.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Deliveries</h3>
        {t.deliveries.length === 0 && <div className="muted">No submissions yet.</div>}
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
            <label>Notes for admin</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div style={{ height: 12 }} />
            <button type="submit" disabled={busy}>{busy ? <><span className="spinner" /> Uploading…</> : "Submit delivery"}</button>
          </form>
        )}
      </div>

      <div className="card">
        <h3>Message admin <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· {msgs.length} message{msgs.length === 1 ? "" : "s"}</span></h3>
        <form onSubmit={sendMessage}>
          <textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Anything admin should know…" />
          <div style={{ height: 8 }} />
          <button type="submit">Send</button>
        </form>
        <hr />
        {msgs.length === 0 && <div className="muted">No messages yet.</div>}
        {msgs.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <div className="muted" style={{ fontSize: 11 }}>
              {m.fromAdmin ? "Admin" : "You"} · {new Date(m.createdAt).toLocaleString()}
              {m.messageType && m.messageType !== "general" && <> · <span className={`tag ${m.messageType === "doubt" ? "review" : "revision"}`} style={{ fontSize: 10 }}>{m.messageType.replace("_", " ")}</span></>}
            </div>
            <div>{m.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
