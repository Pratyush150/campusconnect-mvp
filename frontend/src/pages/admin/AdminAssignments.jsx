import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";

export default function AdminAssignments() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const q = status ? `?status=${status}` : "";
    api.get(`/admin/assignments${q}`).then((r) => setRows(r.data.assignments));
  }, [status]);
  const statuses = ["", "pending", "published", "bidding", "assigned", "in_progress", "review", "revision", "delivered", "completed", "disputed", "cancelled"];
  return (
    <div className="container">
      <h2>Assignments</h2>
      <div className="row" style={{ flexWrap: "wrap", maxWidth: 900, gap: 4 }}>
        {statuses.map((s) => <button key={s || "all"} className={status === s ? "" : "secondary"} onClick={() => setStatus(s)}>{s || "all"}</button>)}
      </div>
      <table className="table" style={{ marginTop: 16 }}>
        <thead><tr><th>Status</th><th>Title</th><th>Client</th><th>Bids</th><th>Final</th><th></th></tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td><span className={`tag ${a.status}`}>{a.status}</span>{a.contactFlagged && <span className="tag flag">flag</span>}</td>
              <td>{a.title}</td>
              <td>{a.client?.fullName}</td>
              <td>{a.bids?.length || 0}</td>
              <td>{a.finalPrice ? `₹${a.finalPrice}` : "—"}</td>
              <td><Link to={`/admin/assignments/${a.id}`}>Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
