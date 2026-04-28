import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useAuth } from "../../auth.jsx";
import Timeline from "../../components/Timeline.jsx";
import { CLIENT_TABS, bucketCount, bucketFilter, deadlineMeta, relativeTime } from "../../lib/assignmentStatus.js";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "client") return;
    setLoading(true);
    api.get("/assignments/my-requests")
      .then((r) => setItems(r.data.assignments))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user?.role]);

  const filtered = useMemo(() => {
    const tabDef = CLIENT_TABS.find((t) => t.key === tab);
    return bucketFilter(items, tabDef?.statuses);
  }, [items, tab]);

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h2>My assignments</h2>
          <div className="page-sub">Track posts, payments and deliveries in one place.</div>
        </div>
        <div className="page-actions">
          <Link to="/mentors"><button className="outline">Browse mentors</button></Link>
          <Link to="/client/new"><button>+ Post requirement</button></Link>
        </div>
      </div>

      <div className="segmented" role="tablist" style={{ marginBottom: 14, flexWrap: "wrap" }}>
        {CLIENT_TABS.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
            <span className="seg-count">{bucketCount(items, t.statuses)}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="card"><span className="skel skel-line w-60" /><span className="skel skel-line w-40" /></div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="empty">
          <strong>{tab === "all" ? "No requirements yet" : "Nothing in this bucket"}</strong>
          {tab === "all" && <div>Click <em>Post requirement</em> to create your first assignment.</div>}
        </div>
      )}

      {filtered.map((a) => {
        const dl = deadlineMeta(a.deadline);
        return (
          <Link key={a.id} to={`/client/assignments/${a.id}`} style={{ color: "inherit", textDecoration: "none" }}>
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className={`tag ${a.status}`}>{a.status}</span>
                {a.contactFlagged && <span className="tag flag">contact-flag</span>}
                {a.revisionRequestCount > 0 && <span className="tag revision">{a.revisionRequestCount}× revision</span>}
              </div>
              <h3 style={{ marginBottom: 2 }}>{a.title}</h3>
              <Timeline assignment={a} />
              <div className="meta-row">
                <span className="meta-item">📅 {new Date(a.deadline).toLocaleDateString()}</span>
                {dl && <span className={`meta-item ${dl.tone || ""}`}>⏰ {dl.label}</span>}
                {a.finalPrice && <span className="meta-item">₹{a.finalPrice}</span>}
                {a.assignedTo && <span className="meta-item">👤 {a.assignedTo}</span>}
                <span className="meta-item">Updated {relativeTime(a.updatedAt)}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
