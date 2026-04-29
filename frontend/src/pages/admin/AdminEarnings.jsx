import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";

const PRESETS = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "Last 7 days", days: 6 },
  { key: "30d", label: "Last 30 days", days: 29 },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Custom" },
];

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeForPreset(key) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (key === "today") return { from: toYMD(today), to: toYMD(today) };
  if (key === "7d") return { from: toYMD(new Date(today.getTime() - 6 * 86400000)), to: toYMD(today) };
  if (key === "30d") return { from: toYMD(new Date(today.getTime() - 29 * 86400000)), to: toYMD(today) };
  if (key === "this_month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toYMD(first), to: toYMD(today) };
  }
  if (key === "last_month") {
    const firstThis = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastPrev = new Date(firstThis.getTime() - 86400000);
    const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
    return { from: toYMD(firstPrev), to: toYMD(lastPrev) };
  }
  return { from: toYMD(new Date(today.getTime() - 29 * 86400000)), to: toYMD(today) };
}

export default function AdminEarnings() {
  const [preset, setPreset] = useState("30d");
  const [range, setRange] = useState(() => rangeForPreset("30d"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr("");
    api.get("/admin/earnings", { params: { from: range.from, to: range.to } })
      .then((r) => { if (!cancelled) setData(r.data); })
      .catch((e) => { if (!cancelled) setErr(e.response?.data?.error || "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range.from, range.to]);

  const setPresetAndRange = (key) => {
    setPreset(key);
    if (key !== "custom") setRange(rangeForPreset(key));
  };

  const exportCsv = () => {
    const url = `/api/admin/earnings/export.csv?from=${range.from}&to=${range.to}`;
    window.open(url, "_blank");
  };

  return (
    <div className="container">
      <Link to="/admin" className="muted">← Overview</Link>
      <div className="page-head" style={{ marginTop: 6 }}>
        <div>
          <h2>Earnings</h2>
          <div className="page-sub">Cash inflow and platform fees in a date range. Click a preset or pick custom dates.</div>
        </div>
        <div className="page-actions">
          <button className="outline" onClick={exportCsv} disabled={!data}>Export CSV</button>
        </div>
      </div>

      <div className="earn-controls">
        <div className="earn-presets">
          {PRESETS.map((p) => (
            <button key={p.key}
              className={`earn-preset ${preset === p.key ? "active" : ""}`}
              onClick={() => setPresetAndRange(p.key)}>{p.label}</button>
          ))}
        </div>
        <div className="earn-range-inputs">
          <input type="date" value={range.from}
            onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, from: e.target.value })); }} />
          <span className="muted">→</span>
          <input type="date" value={range.to}
            onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, to: e.target.value })); }} />
        </div>
      </div>

      {err && <div className="error">{err}</div>}
      {loading && !data && (
        <div className="kpi-hero">
          {[0,1,2].map((i) => <div key={i} className="kpi-card"><span className="skel skel-line w-40" /><span className="skel skel-line w-60" style={{ height: 24 }} /></div>)}
        </div>
      )}

      {data && <Body data={data} range={range} />}
    </div>
  );
}

function Body({ data, range }) {
  const totals = data.totals;
  const deltas = data.deltas;
  const days = data.daily;
  const max = useMemo(() => Math.max(1, ...days.map((d) => d.total)), [days]);
  const fmt = (n) => "₹" + (n || 0).toLocaleString("en-IN");

  return (
    <>
      <div className="kpi-hero">
        <StatCard label="Cash inflow" value={fmt(totals.cashInflow)} delta={deltas.cashInflow} sub={`${totals.transactionCount} captured payments`} />
        <StatCard label="Platform earnings" value={fmt(totals.platformFee)} delta={deltas.platformFee} sub={`Assignments ${fmt(totals.bySource.assignment)} · Mentors ${fmt(totals.bySource.mentor)}`} />
        <StatCard label="Paid out (gross − fee)" value={fmt(totals.providerPayout)} sub={`To doers & mentors`} />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="page-head" style={{ marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Daily platform earnings</h3>
          <div className="muted" style={{ fontSize: 12 }}>{range.from} → {range.to}</div>
        </div>

        {days.every((d) => d.total === 0) ? (
          <div className="empty"><strong>No earnings in this range</strong><div>Try a wider window or a different preset.</div></div>
        ) : (
          <>
            <div className="earn-chart" role="img" aria-label="Daily platform earnings stacked by source">
              {days.map((d) => {
                const pctA = (d.assignment / max) * 100;
                const pctM = (d.mentor / max) * 100;
                const empty = d.total === 0;
                return (
                  <div key={d.date} className="earn-bar-col" data-empty={empty ? "1" : "0"}
                    title={`${d.date}: assignments ${fmt(d.assignment)} · mentors ${fmt(d.mentor)} · total ${fmt(d.total)}`}>
                    <div className="earn-bar-seg" style={{ height: pctA + "%" }} />
                    <div className="earn-bar-seg mentor" style={{ height: pctM + "%" }} />
                  </div>
                );
              })}
            </div>
            <div className="earn-axis">
              <span>{days[0]?.date}</span>
              {days.length > 2 && <span>{days[Math.floor(days.length / 2)].date}</span>}
              <span>{days[days.length - 1]?.date}</span>
            </div>
            <div className="earn-legend">
              <span><span className="earn-legend-dot" style={{ background: "var(--primary)" }} />Assignments</span>
              <span><span className="earn-legend-dot" style={{ background: "#a855f7" }} />Mentor sessions</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, delta, sub }) {
  const deltaClass = delta == null ? "" : delta >= 0 ? "up" : "down";
  const deltaText = delta == null ? "" : `${delta >= 0 ? "+" : ""}${delta}% vs prev period`;
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {deltaText && <div className={`kpi-delta ${deltaClass}`}>{deltaText}</div>}
      {sub && <div className="kpi-delta">{sub}</div>}
    </div>
  );
}
