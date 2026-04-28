import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api.js";
import { useToast, useConfirm, usePrompt } from "../../toast.jsx";
import Timeline from "../../components/Timeline.jsx";
import ReviewForm from "../../components/ReviewForm.jsx";
import { deadlineMeta, relativeTime } from "../../lib/assignmentStatus.js";

export default function AssignmentDetail() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [a, setA] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [progress, setProgress] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get(`/assignments/my-requests/${id}`).then((r) => setA(r.data.assignment)).catch(() => {});
    api.get(`/messages/${id}`).then((r) => setMsgs(r.data.messages)).catch(() => {});
    api.get(`/assignments/${id}/progress`).then((r) => setProgress(r.data.progress)).catch(() => {});
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => { api.get("/reviews/mine").then((r) => setMyReviews(r.data.reviews)).catch(() => {}); }, []);

  const alreadyReviewed = myReviews.some((r) => r.type === "assignment" && r.referenceId === id);

  if (!a) return <div className="container muted">Loading…</div>;

  const dl = deadlineMeta(a.deadline);
  const latestPct = progress[0]?.percentComplete;

  const totalDue = (a.finalPrice || 0) + (a.handwrittenExtra || 0);
  const initialAmt = Math.round(totalDue * 0.30);
  const finalAmt   = totalDue - initialAmt;

  const payInstallment = async (installmentType, label) => {
    const amount = installmentType === "initial" ? initialAmt : finalAmt;
    const go = await confirm({
      title: `Pay ₹${amount} (${label})?`,
      message: installmentType === "initial"
        ? `Held in escrow. Releases to the doer only after you mark complete and pay the remaining ₹${finalAmt}.`
        : "Final 70% — once captured, the assignment is marked complete and payment is released to the doer.",
      confirmLabel: `Pay ₹${amount}`,
    });
    if (!go) return;
    setBusy(true);
    try {
      const o = await api.post("/payments/create-order", { assignmentId: a.id, installmentType });
      await api.post("/payments/mock-capture", { paymentId: o.data.paymentId });
      toast.success(installmentType === "initial" ? "30% captured. Doer can start work." : "Final 70% captured. Assignment complete.");
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Payment failed"); }
    finally { setBusy(false); }
  };

  const markReceived = async () => {
    try {
      await api.post(`/assignments/my-requests/${a.id}/mark-received`);
      toast.success("Marked as received.");
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span className={`tag ${a.status}`}>{a.status}</span>
          {a.isHandwritten && <span className="tag revision">✍️ handwritten</span>}
          {a.revisionRequestCount > 0 && <span className="tag revision">{a.revisionRequestCount}× revision</span>}
        </div>
        <h2 style={{ marginBottom: 2 }}>{a.title}</h2>
        <Timeline assignment={a} />
        <div className="meta-row">
          <span className="meta-item">📅 Deadline {new Date(a.deadline).toLocaleString()}</span>
          {dl && <span className={`meta-item ${dl.tone || ""}`}>⏰ {dl.label}</span>}
          {a.finalPrice && <span className="meta-item">💰 ₹{a.finalPrice}{a.handwrittenExtra ? ` + ₹${a.handwrittenExtra} extra` : ""}</span>}
          {a.assignedTo && <span className="meta-item">👤 {a.assignedTo}</span>}
          {latestPct != null && <span className="meta-item">📊 {latestPct}% reported</span>}
          <span className="meta-item">Updated {relativeTime(a.updatedAt)}</span>
        </div>
        <p style={{ marginTop: 12 }}>{a.description}</p>
        {a.attachments?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <strong style={{ fontSize: 13 }}>Attachments:</strong>
            <ul style={{ marginTop: 4, paddingLeft: 18 }}>
              {a.attachments.map((f, i) => <li key={i}><a href={f.url} target="_blank" rel="noreferrer">{f.filename}</a></li>)}
            </ul>
          </div>
        )}
      </div>

      {a.status === "assigned" && !a.clientPaid && (
        <div className="card">
          <h3>Pay 30% to begin work</h3>
          <p className="muted">
            Total ₹{totalDue}{a.handwrittenExtra ? ` (₹${a.finalPrice} + ₹${a.handwrittenExtra} handwritten extra)` : ""}.
            Pay ₹{initialAmt} now to start; the remaining ₹{finalAmt} is due after you mark the work complete.
          </p>
          <button onClick={() => payInstallment("initial", "30% upfront")} disabled={busy}>
            {busy ? <><span className="spinner" /> Processing…</> : `Pay ₹${initialAmt} (30%)`}
          </button>
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
            <>
              <div style={{ marginTop: 12, padding: 12, background: "var(--panel-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  <strong>Step 1.</strong> {a.clientAcknowledgedAt
                    ? <span style={{ color: "var(--success)" }}>✓ Marked received {relativeTime(a.clientAcknowledgedAt)}</span>
                    : "Confirm you received the files."}
                </div>
                <div style={{ fontSize: 13, marginBottom: 10 }}>
                  <strong>Step 2.</strong> Pay the final ₹{finalAmt} — this completes the order and releases payment to the doer.
                </div>
                <div className="row" style={{ flexWrap: "wrap" }}>
                  {!a.clientAcknowledgedAt && <button className="outline" onClick={markReceived}>📥 Mark as received</button>}
                  <button className="success" onClick={() => payInstallment("final", "final 70%")} disabled={busy}>
                    {busy ? <><span className="spinner" /> Processing…</> : `Pay ₹${finalAmt} & complete`}
                  </button>
                  <button className="outline" onClick={requestRevision}>Ask for revision</button>
                  <button className="destructive" onClick={dispute}>Raise dispute</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {a.status === "completed" && !alreadyReviewed && (
        <ReviewForm
          type="assignment"
          referenceId={a.id}
          label="Review the doer"
          onSubmitted={() => {
            api.get("/reviews/mine").then((r) => setMyReviews(r.data.reviews)).catch(() => {});
          }}
        />
      )}
      {a.status === "completed" && alreadyReviewed && <div className="card muted">✓ You've reviewed this delivery.</div>}

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
