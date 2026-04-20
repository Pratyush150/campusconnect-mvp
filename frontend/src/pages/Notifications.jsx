import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { getSocket } from "../socket.js";

function renderNotif(n) {
  const p = n.payload || {};
  switch (n.type) {
    case "CONN_REQUEST":
      return <>New connection request from <strong>{p.senderName}</strong>{p.message ? ` — "${p.message}"` : ""} — go to <Link to="/connections">Connections</Link></>;
    case "CONN_ACCEPTED":
      return <><strong>{p.receiverName}</strong> accepted your request — <Link to={`/chat/${p.conversationId}`}>open chat</Link></>;
    case "CONN_REJECTED":
      return <><strong>{p.receiverName}</strong> declined your request.</>;
    case "MESSAGE":
      return <>New message from <strong>{p.senderName}</strong>: "{p.preview}" — <Link to={`/chat/${p.conversationId}`}>open</Link></>;
    default:
      return <>Notification: {n.type}</>;
  }
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = () =>
    api.get("/notifications").then((r) => { setItems(r.data.notifications); setUnread(r.data.unread); });

  useEffect(() => {
    load();
    const s = getSocket();
    const onNew = () => load();
    s.on("notification:new", onNew);
    return () => s.off("notification:new", onNew);
  }, []);

  const markAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  return (
    <div className="container">
      <h2>Notifications {unread > 0 && <span className="tag">{unread} new</span>}</h2>
      {unread > 0 && <button className="secondary" onClick={markAll}>Mark all as read</button>}
      {items.length === 0 && <div className="muted" style={{ marginTop: 12 }}>Nothing here yet.</div>}
      {items.map((n) => (
        <div key={n.id} className="card" style={{ opacity: n.readAt ? 0.65 : 1 }}>
          <div>{renderNotif(n)}</div>
          <div className="muted" style={{ marginTop: 4 }}>{new Date(n.createdAt).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
