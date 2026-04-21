import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api.js";
import { useToast, usePrompt } from "../../toast.jsx";

export default function AdminAssignmentDetail() {
  const { id } = useParams();
  const toast = useToast();
  const prompt = usePrompt();
  const [a, setA] = useState(null);
  const [price, setPrice] = useState("");

  const load = () => api.get(`/admin/assignments/${id}`).then((r) => setA(r.data.assignment)).catch(() => {});
  useEffect(() => { load(); }, [id]);

  if (!a) return <div className="container muted">Loading…</div>;

  const act = async (fn, successMsg) => {
    try { await fn(); if (successMsg) toast.success(successMsg); load(); }
    catch (e) { toast.error(e.response?.data?.error || "Failed"); }
  };
  const publish = () => act(() => api.put(`/admin/assignments/${a.id}/publish`), "Published");
  const reject  = async () => {
    const reason = await prompt({ title: "Reject this request", label: "Reason", multiline: true, confirmLabel: "Reject" });
    if (reason) act(() => api.put(`/admin/assignments/${a.id}/reject`, { reason }), "Rejected");
  };
  const assign  = async (bidId) => {
    let p = Number(price);
    if (!p) {
      const v = await prompt({ title: "Final price", label: "Amount (₹)", placeholder: "1100", confirmLabel: "Assign" });
      p = Number(v);
    }
    if (!p) return toast.error("Price required");
    act(() => api.put(`/admin/assignments/${a.id}/assign`, { bidId, finalPrice: p }), "Assigned");
  };
  const approve = (did) => act(() => api.put(`/admin/assignments/${a.id}/approve-delivery`, { deliveryId: did }), "Approved");
  const revise  = async (did) => {
    const fb = await prompt({ title: "Request revision", label: "Feedback to doer", multiline: true, confirmLabel: "Request revision" });
    if (fb) act(() => api.put(`/admin/assignments/${a.id}/request-revision`, { deliveryId: did, feedback: fb }), "Revision requested");
  };
  const forceRelease = () => act(() => api.put(`/admin/assignments/${a.id}/force-release`), "Escrow released");

  return (
    <div className="container">
      <Link to="/admin/assignments" className="muted">← Back</Link>
      <div className="card">
        <span className={`tag ${a.status}`}>{a.status}</span>
        {a.contactFlagged && <span className="tag flag">contact-flag: {a.contactFlags}</span>}
        <h2>{a.title}</h2>
        <div className="muted">
          Client: <strong>{a.client.fullName}</strong> ({a.client.email}) · Deadline {new Date(a.deadline).toLocaleString()}
        </div>
        <p>{a.description}</p>
        {a.assignedDoer && <div>Assigned to: <strong>{a.assignedDoer.fullName}</strong></div>}
        {a.finalPrice && <div>Final price: ₹{a.finalPrice}</div>}
        <div className="row" style={{ maxWidth: 500, marginTop: 10 }}>
          {a.status === "pending" && <button onClick={publish}>Publish (anonymized)</button>}
          {["pending", "published", "bidding"].includes(a.status) && <button className="danger" onClick={reject}>Reject</button>}
          {["delivered"].includes(a.status) && <button onClick={forceRelease}>Force release escrow</button>}
        </div>
      </div>

      <div className="card">
        <h3>Bids ({a.bids.length})</h3>
        {a.bids.length === 0 && <div className="muted">No bids.</div>}
        {a.bids.map((b) => (
          <div key={b.id} className="card" style={{ background: "#0b1120" }}>
            <div>
              <strong>{b.doer.fullName}</strong> — ₹{b.bidAmount}
              <span className={`tag ${b.status}`} style={{ marginLeft: 6 }}>{b.status}</span>
              {b.contactFlagged && <span className="tag flag">flag</span>}
            </div>
            <div className="muted">Rating {b.doer.doerProfile?.rating || 0} · completed {b.doer.doerProfile?.totalCompleted || 0}</div>
            {b.coverNote && <p>"{b.coverNote}"</p>}
            {["published", "bidding"].includes(a.status) && (
              <div style={{ marginTop: 6 }}>
                <input style={{ maxWidth: 140, display: "inline-block", marginRight: 8 }} placeholder={`Final (₹${b.bidAmount})`} value={price} onChange={(e) => setPrice(e.target.value)} />
                <button onClick={() => assign(b.id)}>Assign to this doer</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Deliveries</h3>
        {a.deliveries.length === 0 && <div className="muted">No deliveries.</div>}
        {a.deliveries.map((d) => (
          <div key={d.id} className="card" style={{ background: "#0b1120" }}>
            <div>v{d.version} <span className={`tag ${d.adminReview === "approved" ? "delivered" : d.adminReview === "revision_needed" ? "revision" : "pending"}`}>{d.adminReview}</span></div>
            <ul>{JSON.parse(d.files).map((f, i) => <li key={i}><a href={f.url} target="_blank" rel="noreferrer">{f.filename}</a></li>)}</ul>
            {d.doerNotes && <div className="muted">Notes: {d.doerNotes}</div>}
            {d.adminFeedback && <div className="muted">Feedback: {d.adminFeedback}</div>}
            {a.status === "review" && d.adminReview === "pending" && (
              <div className="row" style={{ maxWidth: 360, marginTop: 6 }}>
                <button className="success" onClick={() => approve(d.id)}>Approve & deliver</button>
                <button className="danger" onClick={() => revise(d.id)}>Request revision</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Payments</h3>
        {a.payments.length === 0 && <div className="muted">No payments.</div>}
        {a.payments.map((p) => (
          <div key={p.id}>₹{p.amount} · {p.status} · {p.paymentType}</div>
        ))}
      </div>
    </div>
  );
}
