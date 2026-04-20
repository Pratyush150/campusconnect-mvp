import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Feed() {
  const [services, setServices] = useState([]);
  const [kind, setKind] = useState("ALL");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (kind !== "ALL") params.set("kind", kind);
    if (q.trim()) params.set("q", q.trim());
    if (tag.trim()) params.set("tag", tag.trim());
    const qs = params.toString() ? `?${params}` : "";
    api.get(`/services${qs}`)
      .then((r) => setServices(r.data.services))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [kind]);

  const onSearch = (e) => {
    e.preventDefault();
    load();
  };

  return (
    <div className="container">
      <h2>Feed</h2>
      <div className="row" style={{ marginBottom: 12, maxWidth: 360 }}>
        <button className={kind === "ALL" ? "" : "secondary"} onClick={() => setKind("ALL")}>All</button>
        <button className={kind === "OFFER" ? "" : "secondary"} onClick={() => setKind("OFFER")}>Offers</button>
        <button className={kind === "REQUEST" ? "" : "secondary"} onClick={() => setKind("REQUEST")}>Requests</button>
      </div>
      <form onSubmit={onSearch} className="row" style={{ marginBottom: 16, maxWidth: 560 }}>
        <input placeholder="Search title / description…" value={q} onChange={(e) => setQ(e.target.value)} />
        <input placeholder="Tag (e.g. DSA)" value={tag} onChange={(e) => setTag(e.target.value)} style={{ maxWidth: 160 }} />
        <button type="submit" style={{ maxWidth: 100 }}>Search</button>
      </form>
      {loading && <div className="muted">Loading…</div>}
      {!loading && services.length === 0 && <div className="muted">No services match. <Link to="/new">Post one</Link>.</div>}
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
