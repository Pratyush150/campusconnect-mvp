import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/dashboard").then((r) => setStats(r.data)); }, []);
  if (!stats) return <div className="container muted">Loading…</div>;

  return (
    <div className="container">
      <h2>Admin — Overview</h2>
      <div className="grid3">
        <Kpi l="Platform earnings (captured ₹)" v={`₹${stats.platformEarningsTotal || 0}`} />
        <Kpi l="Open flags" v={stats.openFlags} danger={stats.openFlags > 0} />
        <Kpi l="Pending reviews" v={stats.pendingReviews} danger={stats.pendingReviews > 0} />
        <Kpi l="Pending bids" v={stats.pendingBids} />
        <Kpi l="Pending payouts" v={stats.pendingPayouts} />
        <Kpi l="Captured payments (₹)" v={`₹${stats.payments.capturedTotal || 0}`} />
      </div>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Users by role</h3>
          {stats.usersByRole.map((r) => <div key={r.role}>{r.role}: {r._count._all}</div>)}
        </div>
        <div className="card">
          <h3>Requests by status</h3>
          {stats.requestsByStatus.map((r) => <div key={r.status}><span className={`tag ${r.status}`}>{r.status}</span> {r._count._all}</div>)}
        </div>
      </div>
      <div className="row" style={{ marginTop: 16, maxWidth: 600 }}>
        <Link to="/admin/assignments"><button>Assignments</button></Link>
        <Link to="/admin/doers"><button className="secondary">Doers</button></Link>
        <Link to="/admin/mentors"><button className="secondary">Mentors</button></Link>
        <Link to="/admin/payouts"><button className="secondary">Payouts</button></Link>
        <Link to="/admin/settings"><button className="secondary">Settings</button></Link>
      </div>
    </div>
  );
}

function Kpi({ l, v, danger }) {
  return <div className="kpi"><div className="l">{l}</div><div className="v" style={{ color: danger ? "#f87171" : "#fbbf24" }}>{v}</div></div>;
}
