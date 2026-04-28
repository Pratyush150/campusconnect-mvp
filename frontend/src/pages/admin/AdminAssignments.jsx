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
      <div className="page-head">
        <div>
          <h2>Assignments</h2>
          <div className="page-sub">{rows.length} {rows.length === 1 ? "result" : "results"}{status ? ` · filter: ${status}` : ""}</div>
        </div>
      </div>
      <div className="segmented" style={{ flexWrap: "wrap", marginBottom: 14 }}>
        {statuses.map((s) => <button key={s || "all"} type="button" className={status === s ? "active" : ""} onClick={() => setStatus(s)}>{s || "all"}</button>)}
      </div>
      {rows.length === 0 ? (
        <div className="empty"><strong>No assignments match</strong><div>Try a different status filter.</div></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
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
      )}
    </div>
  );
}
