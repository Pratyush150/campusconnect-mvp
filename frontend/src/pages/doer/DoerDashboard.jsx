import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useAuth } from "../../auth.jsx";

export default function DoerDashboard() {
  const { profile } = useAuth();
  const [available, setAvailable] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [bids, setBids] = useState([]);

  useEffect(() => {
    if (profile?.isApproved) {
      api.get("/assignments/available").then((r) => setAvailable(r.data.assignments));
      api.get("/assignments/my-tasks").then((r) => setTasks(r.data.tasks));
      api.get("/assignments/my-bids").then((r) => setBids(r.data.bids));
    }
  }, [profile?.isApproved]);

  if (!profile?.isApproved) {
    return (
      <div className="container">
        <div className="card">
          <h2>Awaiting approval</h2>
          <p className="muted">Your doer profile is pending admin review. You'll be able to bid once approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Link to="/mentors" className="muted">Browse mentors →</Link>
      <h2>Available assignments</h2>
      {available.length === 0 && <div className="card muted">None available right now.</div>}
      {available.map((a) => (
        <Link key={a.id} to={`/doer/available/${a.id}`} style={{ color: "inherit" }}>
          <div className="card">
            <span className={`tag ${a.status}`}>{a.status}</span>
            <h3>{a.title}</h3>
            <div className="muted">
              {a.subject} · {a.assignmentType} · Deadline {new Date(a.deadline).toLocaleDateString()}
              {(a.budgetMin || a.budgetMax) && ` · Budget ₹${a.budgetMin || "?"}–${a.budgetMax || "?"}`}
            </div>
          </div>
        </Link>
      ))}

      <h2>My tasks</h2>
      {tasks.length === 0 && <div className="card muted">No active tasks.</div>}
      {tasks.map((t) => (
        <Link key={t.id} to={`/doer/tasks/${t.id}`} style={{ color: "inherit" }}>
          <div className="card">
            <span className={`tag ${t.status}`}>{t.status}</span>
            <h3>{t.title}</h3>
            <div className="muted">Final ₹{t.finalPrice} · paid: {String(t.clientPaid)}</div>
          </div>
        </Link>
      ))}

      <h2>My bids</h2>
      {bids.length === 0 && <div className="card muted">No bids yet.</div>}
      {bids.map((b) => (
        <div key={b.id} className="card">
          <span className={`tag ${b.status}`}>{b.status}</span>
          <strong>{b.assignment.title}</strong>
          <div className="muted">Bid ₹{b.bidAmount} · {new Date(b.createdAt).toLocaleDateString()}</div>
        </div>
      ))}
    </div>
  );
}
