import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useAuth } from "../../auth.jsx";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (user?.role !== "client") return;
    api.get("/assignments/my-requests").then((r) => setItems(r.data.assignments)).catch(() => {});
  }, [user?.role]);
  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2>My Assignments</h2>
        <Link to="/client/new" style={{ marginLeft: "auto" }}><button>+ Post requirement</button></Link>
      </div>
      <Link to="/mentors" className="muted">Browse mentors →</Link>
      {items.length === 0 && <div className="card muted">No requirements yet.</div>}
      {items.map((a) => (
        <Link key={a.id} to={`/client/assignments/${a.id}`} style={{ color: "inherit" }}>
          <div className="card">
            <span className={`tag ${a.status}`}>{a.status}</span>
            {a.contactFlagged && <span className="tag flag">contact-flag</span>}
            <h3>{a.title}</h3>
            <div className="muted">
              Deadline: {new Date(a.deadline).toLocaleString()}
              {a.finalPrice && ` · Final ₹${a.finalPrice}`}
              {a.assignedTo && ` · Assigned to: ${a.assignedTo}`}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
