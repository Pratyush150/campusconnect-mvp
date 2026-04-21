import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api.js";

export default function AssignmentDetail() {
  const { id } = useParams();
  const [a, setA] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState("");

  const load = () => {
    api.get(`/assignments/my-requests/${id}`).then((r) => setA(r.data.assignment));
    api.get(`/messages/${id}`).then((r) => setMsgs(r.data.messages));
  };
  useEffect(() => { load(); }, [id]);

  if (!a) return <div className="container muted">Loading…</div>;

  const pay = async () => {
    setMsg("");
    try {
      const o = await api.post("/payments/create-order", { assignmentId: a.id });
      await api.post("/payments/mock-capture", { paymentId: o.data.paymentId });
      setMsg("Payment captured (mock). Doer can now start work.");
      load();
    } catch (e) { setMsg(e.response?.data?.error || "Failed"); }
  };

  const confirm = async () => {
    setMsg("");
    try { await api.post(`/assignments/my-requests/${a.id}/confirm`); setMsg("Escrow released to doer."); load(); }
    catch (e) { setMsg(e.response?.data?.error || "Failed"); }
  };

  const dispute = async () => {
    const reason = prompt("Describe the issue:");
    if (!reason) return;
    await api.post(`/assignments/my-requests/${a.id}/dispute`, { reason });
    load();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await api.post("/messages/send", { assignmentId: a.id, message: draft });
    setDraft("");
    load();
  };

  return (
    <div className="container" style={{ maxWidth: 780 }}>
      <Link to="/client" className="muted">← My assignments</Link>
      <div className="card" style={{ marginTop: 10 }}>
        <span className={`tag ${a.status}`}>{a.status}</span>
        <h2>{a.title}</h2>
        <div className="muted">Deadline: {new Date(a.deadline).toLocaleString()}</div>
        <p>{a.description}</p>
        {a.finalPrice && <div>Final price: <strong>₹{a.finalPrice}</strong></div>}
        {a.assignedTo && <div className="muted">Assigned to: {a.assignedTo}</div>}
      </div>

      {a.status === "assigned" && !a.clientPaid && (
        <div className="card">
          <h3>Pay escrow to begin work</h3>
          <p className="muted">Payment is held by the platform. Released only after you confirm delivery.</p>
          <button onClick={pay}>Pay ₹{a.finalPrice} (mock)</button>
        </div>
      )}

      {a.deliveries?.length > 0 && (
        <div className="card">
          <h3>Delivery</h3>
          {a.deliveries.map((d) => (
            <div key={d.id}>
              <div className="muted">Version {d.version} · {new Date(d.createdAt).toLocaleString()}</div>
              <ul>{d.files.map((f, i) => <li key={i}><a href={f.url} target="_blank" rel="noreferrer">{f.filename}</a></li>)}</ul>
            </div>
          ))}
          {a.status === "delivered" && <div className="row" style={{ maxWidth: 360, marginTop: 12 }}>
            <button className="success" onClick={confirm}>Confirm & release payment</button>
            <button className="danger" onClick={dispute}>Raise dispute</button>
          </div>}
        </div>
      )}

      <div className="card">
        <h3>Message admin</h3>
        <form onSubmit={sendMessage}>
          <textarea rows={2} placeholder="Anything admin should know…" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div style={{ height: 8 }} />
          <button type="submit">Send</button>
        </form>
        <hr />
        {msgs.length === 0 && <div className="muted">No messages yet.</div>}
        {msgs.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <div className="muted" style={{ fontSize: 11 }}>{m.fromAdmin ? "Admin" : "You"} · {new Date(m.createdAt).toLocaleString()}</div>
            <div>{m.message}</div>
          </div>
        ))}
      </div>
      {msg && <div className="ok">{msg}</div>}
    </div>
  );
}
