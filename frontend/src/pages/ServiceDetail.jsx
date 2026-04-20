import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function ServiceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState(null);
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    api.get(`/services/${id}`).then((r) => setService(r.data.service))
      .catch((e) => setErr(e.response?.data?.error || "Failed"));
  }, [id]);

  if (err) return <div className="container"><div className="error">{err}</div></div>;
  if (!service) return <div className="container"><div className="muted">Loading…</div></div>;

  const isMine = service.author.id === user?.id;

  const connect = async () => {
    setErr(""); setStatus("");
    try {
      await api.post("/connections", { receiverId: service.author.id, serviceId: service.id, message });
      setStatus("Connection request sent. They'll see it in Connections → Incoming.");
    } catch (e) {
      setErr(e.response?.data?.error || "Failed");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this service?")) return;
    await api.delete(`/services/${id}`);
    nav("/feed");
  };

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <div className="card">
        <span className={`tag ${service.kind.toLowerCase()}`}>{service.kind}</span>
        <h2>{service.title}</h2>
        <div className="muted">by {service.author.name} {service.author.college && `· ${service.author.college}`}</div>
        <p style={{ marginTop: 12 }}>{service.description}</p>
        {service.tags && service.tags.split(",").map((t) => <span key={t} className="tag">{t.trim()}</span>)}
        {service.author.bio && <><hr style={{ borderColor: "#334155" }} /><div className="muted">About author: {service.author.bio}</div></>}
      </div>

      {isMine ? (
        <button className="danger" onClick={remove}>Delete this service</button>
      ) : (
        <div className="card">
          <h3>Send a connection request</h3>
          <div className="muted">Chat opens only after {service.author.name} accepts. No DMs before consent.</div>
          <div style={{ height: 8 }} />
          <textarea rows={3} placeholder="Short intro — why you're reaching out"
            value={message} onChange={(e) => setMessage(e.target.value)} />
          <div style={{ height: 8 }} />
          <button onClick={connect}>Send request</button>
          {status && <div className="muted" style={{ marginTop: 8 }}>{status}</div>}
          {err && <div className="error">{err}</div>}
        </div>
      )}
    </div>
  );
}
