import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "./api.js";
import { getSocket } from "./socket.js";

export default function NotifBadge() {
  const [unread, setUnread] = useState(0);

  const refresh = () =>
    api.get("/notifications").then((r) => setUnread(r.data.unread)).catch(() => {});

  useEffect(() => {
    refresh();
    const s = getSocket();
    const onNew = () => refresh();
    s.on("notification:new", onNew);
    return () => s.off("notification:new", onNew);
  }, []);

  return (
    <NavLink to="/notifications" className={({ isActive }) => (isActive ? "active" : "")}>
      🔔 {unread > 0 && <span className="tag" style={{ background: "#dc2626" }}>{unread}</span>}
    </NavLink>
  );
}
