import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { getSocket } from "../socket.js";
import { relativeTime } from "../lib/assignmentStatus.js";

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const popRef = useRef(null);

  const load = () => {
    api.get("/notifications").then((r) => {
      setItems(r.data.notifications);
      setUnread(r.data.unread);
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    const onNew = (n) => {
      setItems((arr) => [n, ...arr].slice(0, 50));
      setUnread((u) => u + 1);
    };
    socket.on("notification:new", onNew);
    return () => { socket.off("notification:new", onNew); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllRead = async () => {
    await api.put("/notifications/read-all");
    setItems((arr) => arr.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };
  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setItems((arr) => arr.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnread((u) => Math.max(0, u - 1));
  };

  return (
    <div className="notif-wrap" ref={popRef}>
      <button
        type="button" className="icon-btn notif-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && <span className="count-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>Notifications</strong>
            {unread > 0 && <button className="link xs" type="button" onClick={markAllRead}>Mark all read</button>}
          </div>
          <div className="notif-list">
            {items.length === 0 && <div className="muted" style={{ padding: 16, textAlign: "center" }}>You're all caught up.</div>}
            {items.map((n) => (
              <div
                key={n.id}
                className={"notif-item " + (n.isRead ? "" : "unread")}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{relativeTime(n.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
