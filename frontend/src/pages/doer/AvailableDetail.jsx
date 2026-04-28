import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../../api.js";
import { useToast } from "../../toast.jsx";
import { deadlineMeta } from "../../lib/assignmentStatus.js";

export default function AvailableDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [a, setA] = useState(null);
  const [my, setMy] = useState(null);
  const [bid, setBid] = useState({ bidAmount: "", estimatedHours: "", coverNote: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/assignments/available/${id}`).then((r) => { setA(r.data.assignment); setMy(r.data.myBid); });
  }, [id]);

  if (!a) return <div className="container muted">Loading…</div>;
  const dl = deadlineMeta(a.deadline);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/assignments/${a.id}/bid`, {
        bidAmount: Number(bid.bidAmount),
        estimatedHours: bid.estimatedHours ? Number(bid.estimatedHours) : null,
        coverNote: bid.coverNote,
      });
      toast.success("Bid placed. Admin will review.");
      nav("/doer");
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <Link to="/doer" className="muted">← Back</Link>
      <div className="card" style={{ marginTop: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
          <span className={`tag ${a.status}`}>{a.status}</span>
          {a.isHandwritten && <span className="tag revision">✍️ handwritten · ₹{a.handwrittenExtra} extra</span>}
        </div>
        <h2 style={{ marginTop: 4 }}>{a.title}</h2>
        <div className="meta-row">
          <span className="meta-item">{a.subject || "—"}</span>
          <span className="meta-item">{a.assignmentType || "—"}</span>
          <span className="meta-item">📅 {new Date(a.deadline).toLocaleString()}</span>
          {dl && <span className={`meta-item ${dl.tone || ""}`}>⏰ {dl.label}</span>}
          {(a.budgetMin || a.budgetMax) && <span className="meta-item">💰 ₹{a.budgetMin || "?"}–{a.budgetMax || "?"}</span>}
        </div>
        <p style={{ marginTop: 12 }}>{a.description}</p>
        {a.attachments?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <strong style={{ fontSize: 13 }}>Reference files:</strong>
            <ul style={{ marginTop: 4, paddingLeft: 18 }}>
              {a.attachments.map((f, i) => <li key={i}><a href={f.url} target="_blank" rel="noreferrer">{f.filename}</a></li>)}
            </ul>
          </div>
        )}
      </div>

      {my ? (
        <div className="card">
          <h3>Your bid</h3>
          <div><strong>₹{my.bidAmount}</strong> · <span className={`tag ${my.status}`}>{my.status}</span></div>
          {my.coverNote && <p className="muted" style={{ marginTop: 8 }}>"{my.coverNote}"</p>}
        </div>
      ) : (
        <div className="card">
          <h3>Place a bid</h3>
          <form onSubmit={submit}>
            <div className="grid2">
              <div><label className="required">Bid amount (₹)</label><input type="number" min="0" value={bid.bidAmount} onChange={(e) => setBid({ ...bid, bidAmount: e.target.value })} required /></div>
              <div><label>Estimated hours</label><input type="number" min="0" value={bid.estimatedHours} onChange={(e) => setBid({ ...bid, estimatedHours: e.target.value })} /></div>
            </div>
            <label>Cover note <span className="muted">(no contact info — flags to admin)</span></label>
            <textarea rows={4} value={bid.coverNote} onChange={(e) => setBid({ ...bid, coverNote: e.target.value })} />
            <div style={{ height: 14 }} />
            <button type="submit" disabled={busy}>
              {busy ? <><span className="spinner" /> Submitting…</> : "Submit bid"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
