import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api.js";
import { useToast, useConfirm, usePrompt } from "../../toast.jsx";
import Timeline from "../../components/Timeline.jsx";
import { deadlineMeta, relativeTime } from "../../lib/assignmentStatus.js";

export default function AssignmentDetail() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [a, setA] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [progress, setProgress] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get(`/assignments/my-requests/${id}`).then((r) => setA(r.data.assignment)).catch(() => {});
    api.get(`/messages/${id}`).then((r) => setMsgs(r.data.messages)).catch(() => {});
    api.get(`/assignments/${id}/progress`).then((r) => setProgress(r.data.progress)).catch(() => {});
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!a) return <div className="container muted">Loading…</div>;

  const dl = deadlineMeta(a.deadline);
  const latestPct = progress[0]?.percentComplete;

  const pay = async () => {
    const go = await confirm({
      title: `Pay ₹${a.finalPrice}?`,
      message: "Money is held in escrow and released when you confirm delivery.",
      confirmLabel: `Pay ₹${a.finalPrice}`,
    });
    if (!go) return;
    setBusy(true);
    try {
      const o = await api.post("/payments/create-order", { assignmentId: a.id });
      await api.post("/payments/mock-capture", { paymentId: o.data.paymentId });
      toast.success("Payment captured. Doer can start work.");
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Payment failed"); }
    finally { setBusy(false); }
  };

  const confirmReceipt = async () => {
    const go = await confirm({ title: "Confirm delivery?", message: "Escrow will release to the expert." });
    if (!go) return;
    try {
      await api.post(`/assignments/my-requests/${a.id}/confirm`);
      toast.success("Payment released.");
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
  };

  const requestRevision = async () => {
    const reason = await prompt({
      title: "Ask for a revision",
      label: "What needs to change? Be specific so admin can route it to the doer.",
      multiline: true, confirmLabel: "Send to admin",
    });
    if (!reason) return;
    try {
      await api.post(`/assignments/my-requests/${a.id}/request-revision`, { reason });
      toast.success("Revision request sent to admin.");
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
  };

  const dispute = async () => {
    const reason = await prompt({
      title: "Raise a dispute",
      label: "Describe the issue. Use this only when revision won't fix it — escrow is paused.",
      multiline: true, confirmLabel: "Submit dispute",
    });
    if (!reason) return;
    try {
      await api.post(`/assignments/my-requests/${a.id}/dispute`, { reason });
      toast.info("Dispute raised — admin will review.");
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await api.post("/messages/send", { assignmentId: a.id, message: draft });
    setDraft("");
    load();
  };

  return (
    <div className="container" style={{ maxWidth: 880 }}>
      <Link to="/client" className="muted">← My assignments</Link>

      <div className="card" style={{ marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className={`tag ${a.status}`}>{a.status}</span>
          {a.revisionRequestCount > 0 && <span className="tag revision">{a.revisionRequestCount}× revision</span>}
        </div>
        <h2 style={{ marginBottom: 2 }}>{a.title}</h2>
        <Timeline assignment={a} />
        <div className="meta-row">
          <span className="meta-item">📅 Deadline {new Date(a.deadline).toLocaleString()}</span>
          {dl && <span className={`meta-item ${dl.tone || ""}`}>⏰ {dl.label}</span>}
          {a.finalPrice && <span className="meta-item">💰 ₹{a.finalPrice}</span>}
          {a.assignedTo && <span className="meta-item">👤 {a.assignedTo}</span>}
          {latestPct != null && <span className="meta-item">📊 {latestPct}% reported</span>}
          <span className="meta-item">Updated {relativeTime(a.updatedAt)}</span>
        </div>
        <p style={{ marginTop: 12 }}>{a.description}</p>
      </div>

      {a.status === "assigned" && !a.clientPaid && (
        <div className="card">
          <h3>Pay escrow to begin work</h3>
          <p className="muted">Payment is held by the platform. Released only after you confirm delivery.</p>
          <button onClick={pay} disabled={busy}>{busy ? <><span className="spinner" /> Processing…</> : `Pay ₹${a.finalPrice}`}</button>
        </div>
      )}

      <div className="card">
        <h3>Doer progress</h3>
        {progress.length === 0 && <div className="muted">No updates yet — your doer will post progress here as work moves along.</div>}
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

      {a.deliveries?.length > 0 && (
        <div className="card">
          <h3>Delivery</h3>
          {a.deliveries.map((d) => (
            <div key={d.id} style={{ marginBottom: 8 }}>
              <div className="muted">Version {d.version} · {new Date(d.createdAt).toLocaleString()}</div>
              <ul>{d.files.map((f, i) => <li key={i}><a href={f.url} target="_blank" rel="noreferrer">{f.filename}</a></li>)}</ul>
            </div>
          ))}
          {a.status === "delivered" && (
            <div className="row" style={{ flexWrap: "wrap", marginTop: 12 }}>
              <button className="success" onClick={confirmReceipt}>Confirm & release payment</button>
              <button className="outline" onClick={requestRevision}>Ask for revision</button>
              <button className="destructive" onClick={dispute}>Raise dispute</button>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3>Message admin <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· {msgs.length} message{msgs.length === 1 ? "" : "s"}</span></h3>
        <form onSubmit={sendMessage}>
          <textarea rows={2} placeholder="Anything admin should know…" value={draft} onChange={(e) => setDraft(e.target.value)} />
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
