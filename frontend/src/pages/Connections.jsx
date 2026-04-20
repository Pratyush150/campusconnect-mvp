import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Connections({ tab: initialTab }) {
  const [tab, setTab] = useState(initialTab || "incoming");
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [chats, setChats] = useState([]);

  const load = async () => {
    const [i, o, c] = await Promise.all([
      api.get("/connections/incoming"),
      api.get("/connections/outgoing"),
      api.get("/conversations"),
    ]);
    setIncoming(i.data.requests);
    setOutgoing(o.data.requests);
    setChats(c.data.conversations);
  };
  useEffect(() => { load(); }, []);

  const respond = async (id, action) => {
    await api.post(`/connections/${id}/${action}`);
    await load();
  };

  return (
    <div className="container">
      <h2>Connections</h2>
      <div className="row" style={{ maxWidth: 480, marginBottom: 12 }}>
        <button className={tab === "incoming" ? "" : "secondary"} onClick={() => setTab("incoming")}>Incoming ({incoming.filter(r => r.status === "PENDING").length})</button>
        <button className={tab === "outgoing" ? "" : "secondary"} onClick={() => setTab("outgoing")}>Outgoing</button>
        <button className={tab === "chats" ? "" : "secondary"} onClick={() => setTab("chats")}>Chats ({chats.length})</button>
      </div>

      {tab === "incoming" && incoming.map((r) => (
        <div className="card" key={r.id}>
          <div><strong>{r.sender.name}</strong> <span className="muted">· {r.sender.college || "—"}</span></div>
          {r.message && <p>{r.message}</p>}
          <div className="muted">Status: {r.status}</div>
          {r.status === "PENDING" && (
            <div style={{ marginTop: 8 }}>
              <button onClick={() => respond(r.id, "accept")}>Accept</button>
              <button className="danger" style={{ marginLeft: 8 }} onClick={() => respond(r.id, "reject")}>Reject</button>
            </div>
          )}
        </div>
      ))}

      {tab === "outgoing" && outgoing.map((r) => (
        <div className="card" key={r.id}>
          <div>To <strong>{r.receiver.name}</strong></div>
          {r.message && <p>{r.message}</p>}
          <div className="muted">Status: {r.status}</div>
        </div>
      ))}

      {tab === "chats" && (
        chats.length === 0
          ? <div className="muted">No chats yet. Accept a request to start one.</div>
          : chats.map((c) => (
              <Link key={c.id} to={`/chat/${c.id}`} style={{ color: "inherit" }}>
                <div className="card">
                  <strong>{c.participants.map((p) => p.name).join(", ")}</strong>
                  <div className="muted">
                    {c.messages[0] ? `Last: ${c.messages[0].content.slice(0, 60)}` : "No messages yet"}
                  </div>
                </div>
              </Link>
            ))
      )}
    </div>
  );
}
