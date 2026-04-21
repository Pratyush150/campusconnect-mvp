import { useEffect, useState } from "react";
import { api } from "../../api.js";

export default function AdminPayouts() {
  const [rows, setRows] = useState([]);
  const load = () => api.get("/admin/payouts").then((r) => setRows(r.data.payouts));
  useEffect(() => { load(); }, []);
  const approve = async (id) => { await api.put(`/admin/payouts/${id}/approve`); load(); };
  const reject  = async (id) => { await api.put(`/admin/payouts/${id}/reject`); load(); };
  return (
    <div className="container">
      <h2>Pending payouts</h2>
      {rows.length === 0 && <div className="muted">None.</div>}
      {rows.map((p) => (
        <div key={p.id} className="card">
          <strong>{p.user.fullName}</strong> ({p.user.role}) — ₹{p.amount}
          <div className="muted">Bank: {p.bankDetails.accountNumber} · IFSC {p.bankDetails.ifsc} {p.bankDetails.upi ? ` · UPI ${p.bankDetails.upi}` : ""}</div>
          <div className="row" style={{ maxWidth: 360, marginTop: 6 }}>
            <button className="success" onClick={() => approve(p.id)}>Approve</button>
            <button className="danger" onClick={() => reject(p.id)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
