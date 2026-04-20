import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Feed() {
  const [services, setServices] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = filter === "ALL" ? "" : `?kind=${filter}`;
    api.get(`/services${q}`)
      .then((r) => setServices(r.data.services))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="container">
      <h2>Feed</h2>
      <div className="row" style={{ marginBottom: 12, maxWidth: 360 }}>
        <button className={filter === "ALL" ? "" : "secondary"} onClick={() => setFilter("ALL")}>All</button>
        <button className={filter === "OFFER" ? "" : "secondary"} onClick={() => setFilter("OFFER")}>Offers</button>
        <button className={filter === "REQUEST" ? "" : "secondary"} onClick={() => setFilter("REQUEST")}>Requests</button>
      </div>
      {loading && <div className="muted">Loading…</div>}
      {!loading && services.length === 0 && <div className="muted">No services yet. <Link to="/new">Post one</Link>.</div>}
      {services.map((s) => (
        <Link key={s.id} to={`/services/${s.id}`} style={{ display: "block", color: "inherit" }}>
          <div className="card">
            <span className={`tag ${s.kind.toLowerCase()}`}>{s.kind}</span>
            <h3>{s.title}</h3>
            <div className="muted">
              by {s.author.name}{s.author.college ? ` · ${s.author.college}` : ""}
            </div>
            <p style={{ marginTop: 8 }}>{s.description}</p>
            {s.tags && s.tags.split(",").map((t) => <span key={t} className="tag">{t.trim()}</span>)}
          </div>
        </Link>
      ))}
    </div>
  );
}
