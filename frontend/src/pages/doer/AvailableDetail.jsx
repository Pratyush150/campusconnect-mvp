import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../../api.js";

export default function AvailableDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [a, setA] = useState(null);
  const [my, setMy] = useState(null);
  const [bid, setBid] = useState({ bidAmount: "", estimatedHours: "", coverNote: "" });
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get(`/assignments/available/${id}`).then((r) => { setA(r.data.assignment); setMy(r.data.myBid); });
  }, [id]);

  if (!a) return <div className="container muted">Loading…</div>;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.post(`/assignments/${a.id}/bid`, {
        bidAmount: Number(bid.bidAmount),
        estimatedHours: bid.estimatedHours ? Number(bid.estimatedHours) : null,
        coverNote: bid.coverNote,
      });
      nav("/doer");
    } catch (e) { setErr(e.response?.data?.error || "Failed"); }
  };

  return (
    <div className="container" style={{ maxWidth: 680 }}>
      <Link to="/doer" className="muted">← Back</Link>
      <div className="card">
        <span className={`tag ${a.status}`}>{a.status}</span>
        <h2>{a.title}</h2>
        <div className="muted">{a.subject} · {a.assignmentType} · Deadline {new Date(a.deadline).toLocaleString()}</div>
        <p>{a.description}</p>
        {(a.budgetMin || a.budgetMax) && <div className="muted">Budget ₹{a.budgetMin || "?"}–{a.budgetMax || "?"}</div>}
      </div>

      {my ? (
        <div className="card">
          <h3>Your bid</h3>
          <div>₹{my.bidAmount} · {my.status}</div>
          {my.coverNote && <div className="muted">"{my.coverNote}"</div>}
        </div>
      ) : (
        <div className="card">
          <h3>Place a bid</h3>
          <form onSubmit={submit}>
            <div className="grid2">
              <div><label>Bid amount (₹)</label><input type="number" min="0" value={bid.bidAmount} onChange={(e) => setBid({ ...bid, bidAmount: e.target.value })} required /></div>
              <div><label>Estimated hours</label><input type="number" min="0" value={bid.estimatedHours} onChange={(e) => setBid({ ...bid, estimatedHours: e.target.value })} /></div>
            </div>
            <div style={{ height: 8 }} />
            <label>Cover note (no contact info — flags to admin)</label>
            <textarea rows={4} value={bid.coverNote} onChange={(e) => setBid({ ...bid, coverNote: e.target.value })} />
            {err && <div className="error">{err}</div>}
            <div style={{ height: 12 }} />
            <button type="submit">Submit bid</button>
          </form>
        </div>
      )}
    </div>
  );
}
