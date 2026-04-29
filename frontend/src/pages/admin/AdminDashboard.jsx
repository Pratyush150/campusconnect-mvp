import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { relativeTime } from "../../lib/assignmentStatus.js";

export default function AdminDashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/admin/dashboard").then((r) => setS(r.data)).catch(() => {}); }, []);

  if (!s) {
    return (
      <div className="container">
        <div className="kpi-hero">
          {[0,1,2,3].map((i) => <div key={i} className="kpi-card"><span className="skel skel-line w-40" /><span className="skel skel-line w-60" style={{ height: 24 }} /></div>)}
        </div>
      </div>
    );
  }

  const totalUsers = s.usersByRole.reduce((acc, r) => acc + r._count._all, 0) || 1;
  const totalReqs = s.requestsByStatus.reduce((acc, r) => acc + r._count._all, 0) || 1;
  const requestStatusOrder = ["pending","published","bidding","assigned","in_progress","review","revision","delivered","completed","disputed","cancelled","refunded"];
  const sortedReqs = [...s.requestsByStatus].sort(
    (a, b) => requestStatusOrder.indexOf(a.status) - requestStatusOrder.indexOf(b.status),
  );
  const maxReqCount = Math.max(...sortedReqs.map((r) => r._count._all), 1);
  const usersByRoleSorted = [...s.usersByRole].sort((a, b) => b._count._all - a._count._all);
  const ROLE_COLORS = {
    client: "#3b82f6",
    doer: "#10b981",
    mentor: "#a855f7",
    admin: "#f59e0b",
  };
  // build a multi-segment conic-gradient string
  let acc = 0;
  const segments = usersByRoleSorted.map((r) => {
    const pct = (r._count._all / totalUsers) * 100;
    const start = acc;
    acc += pct;
    return { role: r.role, pct, start, end: acc, color: ROLE_COLORS[r.role] || "#64748b" };
  });
  const donutBg = "conic-gradient(" +
    segments.map((seg) => `${seg.color} ${seg.start}% ${seg.end}%`).join(", ") +
    ")";

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h2>Overview</h2>
          <div className="page-sub">Real-time signal across users, jobs, payments and review queues.</div>
        </div>
        <div className="page-actions">
          <Link to="/admin/assignments"><button>Assignments</button></Link>
          <Link to="/admin/earnings"><button className="outline">Earnings</button></Link>
          <Link to="/admin/payouts"><button className="outline">Payouts</button></Link>
          <Link to="/admin/settings"><button className="outline">Settings</button></Link>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="kpi-hero">
        <Link to="/admin/earnings" className="kpi-card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="kpi-label">Platform earnings</div>
          <div className="kpi-value">₹{s.platformEarningsTotal.toLocaleString("en-IN")}</div>
          <div className="kpi-delta up">+ ₹{s.last7d.platformFee.toLocaleString("en-IN")} last 7d · view breakdown →</div>
          <div className="kpi-icon" aria-hidden="true">💰</div>
        </Link>
        <div className="kpi-card">
          <div className="kpi-label">Active assignments</div>
          <div className="kpi-value">{s.activeAssignments}</div>
          <div className="kpi-delta">+{s.last7d.newRequests} new last 7d</div>
          <div className="kpi-icon" aria-hidden="true">📦</div>
        </div>
        <div className={`kpi-card ${s.openFlags > 0 ? "danger" : ""}`}>
          <div className="kpi-label">Open contact flags</div>
          <div className="kpi-value">{s.openFlags}</div>
          <div className="kpi-delta">{s.openFlags > 0 ? "Action needed" : "All clear"}</div>
          <div className="kpi-icon" aria-hidden="true">🚩</div>
        </div>
        <div className={`kpi-card ${s.pendingPayouts > 0 ? "warn" : ""}`}>
          <div className="kpi-label">Pending payouts</div>
          <div className="kpi-value">{s.pendingPayouts}</div>
          <div className="kpi-delta">{s.pendingReviews} reviews · {s.pendingBids} bids</div>
          <div className="kpi-icon" aria-hidden="true">💸</div>
        </div>
      </div>

      {/* Action queue + activity feed */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="page-head" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Action queue</h3>
            <div className="muted">Top items needing your eyes</div>
          </div>
          <div className="action-queue">
            {s.queues.flagged.map((f) => (
              <Link key={f.id} to={`/admin/assignments/${f.id}`} className="action-row danger">
                <span className="action-bullet" />
                <span className="action-title">🚩 Flag · {f.title}</span>
                <span className="action-meta">{f.contactFlags || "review"} · {relativeTime(f.createdAt)}</span>
              </Link>
            ))}
            {s.queues.pendingReview.map((d) => (
              <Link key={d.id} to={`/admin/assignments/${d.assignmentId}`} className="action-row warn">
                <span className="action-bullet" />
                <span className="action-title">📥 Delivery v{d.version} · {d.assignment?.title}</span>
                <span className="action-meta">{relativeTime(d.createdAt)}</span>
              </Link>
            ))}
            {s.queues.pendingPayout.map((p) => (
              <Link key={p.id} to="/admin/payouts" className="action-row">
                <span className="action-bullet" />
                <span className="action-title">💸 Payout ₹{p.amount} · {p.user?.fullName}</span>
                <span className="action-meta">{relativeTime(p.createdAt)}</span>
              </Link>
            ))}
            {s.queues.flagged.length + s.queues.pendingReview.length + s.queues.pendingPayout.length === 0 && (
              <div className="empty"><strong>Inbox zero</strong><div>No flags, deliveries or payouts waiting.</div></div>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Recent activity</h3>
          <div className="activity-feed">
            {s.recentActivity.map((a) => (
              <div key={a.id} className="activity-item">
                <span className="activity-time">{relativeTime(a.createdAt)}</span>
                <span className="activity-text">
                  <strong>{a.actor?.fullName || "system"}</strong> {a.action.replace(/_/g, " ")}
                  {a.newState && <> → <code>{a.newState}</code></>}
                  <span className="muted"> · {a.entity}</span>
                </span>
              </div>
            ))}
            {s.recentActivity.length === 0 && <div className="muted">Quiet day.</div>}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="card">
          <h3>Users by role</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
            <div className="donut" style={{ background: donutBg }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", zIndex: 2 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{totalUsers}</div>
                <div className="muted" style={{ fontSize: 11 }}>users</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              {segments.map((seg) => (
                <div key={seg.role} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, display: "inline-block" }} />
                  <span style={{ flex: 1, textTransform: "capitalize" }}>{seg.role}</span>
                  <strong>{Math.round(seg.pct)}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Requests by status</h3>
          <div>
            {sortedReqs.map((r) => (
              <div key={r.status} className="bar-row">
                <span className="bar-label" style={{ textTransform: "capitalize" }}>{r.status.replace(/_/g, " ")}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(r._count._all / maxReqCount) * 100}%` }} />
                </div>
                <span className="bar-value">{r._count._all}</span>
              </div>
            ))}
            {sortedReqs.length === 0 && <div className="muted">No requests yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
