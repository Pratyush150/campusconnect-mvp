import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth.jsx";
import Login from "./pages/Login.jsx";
import Feed from "./pages/Feed.jsx";
import ServiceDetail from "./pages/ServiceDetail.jsx";
import Connections from "./pages/Connections.jsx";
import Chat from "./pages/Chat.jsx";
import NewService from "./pages/NewService.jsx";

function Nav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  if (!user) return null;
  const cls = ({ isActive }) => (isActive ? "active" : "");
  return (
    <div className="nav">
      <strong>CampusConnect</strong>
      <NavLink to="/feed" className={cls}>Feed</NavLink>
      <NavLink to="/new" className={cls}>Post</NavLink>
      <NavLink to="/connections" className={cls}>Connections</NavLink>
      <NavLink to="/chats" className={cls}>Chats</NavLink>
      <div style={{ marginLeft: "auto" }} className="muted">
        {user.name} ({user.email})
      </div>
      <button className="secondary" onClick={async () => { await logout(); nav("/login"); }}>
        Log out
      </button>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function ChatList() {
  return <Connections tab="chats" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/feed" element={<RequireAuth><Feed /></RequireAuth>} />
        <Route path="/new" element={<RequireAuth><NewService /></RequireAuth>} />
        <Route path="/services/:id" element={<RequireAuth><ServiceDetail /></RequireAuth>} />
        <Route path="/connections" element={<RequireAuth><Connections /></RequireAuth>} />
        <Route path="/chats" element={<RequireAuth><ChatList /></RequireAuth>} />
        <Route path="/chat/:id" element={<RequireAuth><Chat /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </AuthProvider>
  );
}
