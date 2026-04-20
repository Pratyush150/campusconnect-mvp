import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Profile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = () =>
    api.get(`/users/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.error || "Failed"));

  useEffect(() => { load(); }, [id]);

  if (err) return <div className="container"><div className="error">{err}</div></div>;
  if (!data) return <div className="container"><div className="muted">Loading…</div></div>;

  const u = data.user;
  const isMe = me?.id === u.id;

  const toggleBlock = async () => {
    if (data.blockedByMe) await api.delete(`/blocks/${u.id}`);
    else await api.post("/blocks", { userId: u.id });
    load();
  };

  const connect = async () => {
    try {
      await api.post("/connections", { receiverId: u.id, message: "" });
      alert("Request sent");
    } catch (e) {
      alert(e.response?.data?.error || "Failed");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {u.avatarUrl ? <img src={u.avatarUrl} style={{ width: 64, height: 64, borderRadius: "50%" }} /> : null}
          <div>
            <h2 style={{ margin: 0 }}>{u.name}</h2>
            <div className="muted">
              {u.college || "—"}{u.major ? ` · ${u.major}` : ""}{u.year ? ` · Year ${u.year}` : ""}
            </div>
            <div className="muted">{u.email}</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            {isMe ? (
              <button onClick={() => nav("/me/edit")}>Edit profile</button>
            ) : (
              <>
                <button onClick={connect}>Connect</button>
                <button className={data.blockedByMe ? "secondary" : "danger"} style={{ marginLeft: 8 }} onClick={toggleBlock}>
                  {data.blockedByMe ? "Unblock" : "Block"}
                </button>
              </>
            )}
          </div>
        </div>
        {u.bio && <p style={{ marginTop: 12 }}>{u.bio}</p>}
        {u.skills && u.skills.split(",").map((t) => <span key={t} className="tag">{t.trim()}</span>)}
        {(u.github || u.linkedin) && (
          <div className="muted" style={{ marginTop: 8 }}>
            {u.github && <>GitHub: <a href={`https://github.com/${u.github}`} target="_blank" rel="noreferrer">@{u.github}</a>{"  "}</>}
            {u.linkedin && <>LinkedIn: <a href={u.linkedin.startsWith("http") ? u.linkedin : `https://linkedin.com/in/${u.linkedin}`} target="_blank" rel="noreferrer">link</a></>}
          </div>
        )}
      </div>

      <h3>Services</h3>
      {data.services.length === 0 && <div className="muted">No services posted.</div>}
      {data.services.map((s) => (
        <Link key={s.id} to={`/services/${s.id}`} style={{ color: "inherit" }}>
          <div className="card">
            <span className={`tag ${s.kind.toLowerCase()}`}>{s.kind}</span>
            <strong style={{ marginLeft: 8 }}>{s.title}</strong>
            <p style={{ margin: "6px 0 0" }}>{s.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
