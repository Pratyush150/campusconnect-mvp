import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useAuth } from "../../auth.jsx";
import Timeline from "../../components/Timeline.jsx";
import { DOER_TABS, bucketCount, bucketFilter, deadlineMeta, relativeTime } from "../../lib/assignmentStatus.js";

export default function DoerDashboard() {
  const { user, profile } = useAuth();
  const [available, setAvailable] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [bids, setBids] = useState([]);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (user?.role !== "doer" || !profile?.isApproved) return;
    api.get("/assignments/available").then((r) => setAvailable(r.data.assignments)).catch(() => {});
    api.get("/assignments/my-tasks").then((r) => setTasks(r.data.tasks)).catch(() => {});
    api.get("/assignments/my-bids").then((r) => setBids(r.data.bids)).catch(() => {});
  }, [user?.role, profile?.isApproved]);

  const filteredTasks = useMemo(() => {
    const def = DOER_TABS.find((t) => t.key === tab);
    return bucketFilter(tasks, def?.statuses);
  }, [tasks, tab]);

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
      <div className="page-head">
        <div>
          <h2>Doer workspace</h2>
          <div className="page-sub">Bid on jobs, run your tasks, log progress.</div>
        </div>
        <div className="page-actions">
          <Link to="/mentors"><button className="outline">Browse mentors</button></Link>
        </div>
      </div>

      {/* My tasks tracker */}
      <h3 style={{ marginTop: 8 }}>My tasks</h3>
      <div className="segmented" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        {DOER_TABS.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
            <span className="seg-count">{bucketCount(tasks, t.statuses)}</span>
          </button>
        ))}
      </div>
      {filteredTasks.length === 0 && <div className="empty"><strong>Nothing here</strong><div>Win a bid and your tasks will show up in this bucket.</div></div>}
      {filteredTasks.map((t) => {
        const dl = deadlineMeta(t.deadline);
        return (
          <Link key={t.id} to={`/doer/tasks/${t.id}`} style={{ color: "inherit", textDecoration: "none" }}>
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className={`tag ${t.status}`}>{t.status}</span>
                {t.clientPaid && <span className="tag completed">paid</span>}
                {t.revisionCount > 0 && <span className="tag revision">v{t.revisionCount + 1}</span>}
              </div>
              <h3 style={{ marginBottom: 2 }}>{t.title}</h3>
              <Timeline assignment={t} />
              <div className="meta-row">
                <span className="meta-item">📅 {new Date(t.deadline).toLocaleDateString()}</span>
                {dl && <span className={`meta-item ${dl.tone || ""}`}>⏰ {dl.label}</span>}
                {t.finalPrice && <span className="meta-item">💰 ₹{t.finalPrice}</span>}
                <span className="meta-item">Updated {relativeTime(t.updatedAt)}</span>
              </div>
            </div>
          </Link>
        );
      })}

      {/* Available */}
      <h3 style={{ marginTop: 24 }}>Available assignments</h3>
      {available.length === 0 && <div className="empty"><strong>No open jobs right now</strong><div>Check back soon — admin publishes new ones throughout the day.</div></div>}
      {available.map((a) => (
        <Link key={a.id} to={`/doer/available/${a.id}`} style={{ color: "inherit", textDecoration: "none" }}>
          <div className="card">
            <span className={`tag ${a.status}`}>{a.status}</span>
            <h3>{a.title}</h3>
            <div className="meta-row">
              <span className="meta-item">{a.subject || "—"}</span>
              <span className="meta-item">{a.assignmentType || "—"}</span>
              <span className="meta-item">📅 {new Date(a.deadline).toLocaleDateString()}</span>
              {(a.budgetMin || a.budgetMax) && <span className="meta-item">₹{a.budgetMin || "?"}–{a.budgetMax || "?"}</span>}
            </div>
          </div>
        </Link>
      ))}

      {/* My bids */}
      <h3 style={{ marginTop: 24 }}>My bids</h3>
      {bids.length === 0 && <div className="empty"><strong>No bids yet</strong><div>Open an available assignment and place a bid to get started.</div></div>}
      {bids.map((b) => (
        <div key={b.id} className="card">
          <span className={`tag ${b.status}`}>{b.status}</span>
          <strong>{b.assignment.title}</strong>
          <div className="meta-row">
            <span className="meta-item">Bid ₹{b.bidAmount}</span>
            <span className="meta-item">{relativeTime(b.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
