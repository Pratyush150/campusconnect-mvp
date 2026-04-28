import { Routes, Route, Navigate, NavLink, useNavigate, Link } from "react-router-dom";
import { AuthProvider, useAuth, dashboardPath } from "./auth.jsx";
import { useTheme } from "./theme.jsx";
import NotificationBell from "./components/NotificationBell.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import RegisterChooser from "./pages/RegisterChooser.jsx";
import RegisterClient from "./pages/RegisterClient.jsx";
import RegisterDoer from "./pages/RegisterDoer.jsx";
import RegisterMentor from "./pages/RegisterMentor.jsx";

import ClientDashboard from "./pages/client/ClientDashboard.jsx";
import NewAssignment from "./pages/client/NewAssignment.jsx";
import AssignmentDetail from "./pages/client/AssignmentDetail.jsx";

import DoerDashboard from "./pages/doer/DoerDashboard.jsx";
import AvailableDetail from "./pages/doer/AvailableDetail.jsx";
import TaskDetail from "./pages/doer/TaskDetail.jsx";

import MentorDashboard from "./pages/mentor/MentorDashboard.jsx";

import MentorList from "./pages/mentors/MentorList.jsx";
import MentorDetail from "./pages/mentors/MentorDetail.jsx";
import BookingDetail from "./pages/BookingDetail.jsx";
import MyBookings from "./pages/MyBookings.jsx";

import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminAssignments from "./pages/admin/AdminAssignments.jsx";
import AdminAssignmentDetail from "./pages/admin/AdminAssignmentDetail.jsx";
import AdminDoers from "./pages/admin/AdminDoers.jsx";
import AdminMentors from "./pages/admin/AdminMentors.jsx";
import AdminPayouts from "./pages/admin/AdminPayouts.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggle} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

function Nav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const cls = ({ isActive }) => (isActive ? "active" : "");
  if (!user) return null;
  return (
    <div className="nav">
      <strong>CampusConnect</strong>
      {user.role === "client" && <>
        <NavLink to="/client" className={cls}>My assignments</NavLink>
        <NavLink to="/client/new" className={cls}>+ Post</NavLink>
        <NavLink to="/mentors" className={cls}>Mentors</NavLink>
        <NavLink to="/bookings" className={cls}>Bookings</NavLink>
      </>}
      {user.role === "doer" && <>
        <NavLink to="/doer" className={cls}>Dashboard</NavLink>
        <NavLink to="/mentors" className={cls}>Mentors</NavLink>
        <NavLink to="/bookings" className={cls}>Bookings</NavLink>
      </>}
      {user.role === "mentor" && <>
        <NavLink to="/mentor" className={cls}>My slots</NavLink>
      </>}
      {user.role === "admin" && <>
        <NavLink to="/admin" className={cls}>Overview</NavLink>
        <NavLink to="/admin/assignments" className={cls}>Assignments</NavLink>
        <NavLink to="/admin/doers" className={cls}>Doers</NavLink>
        <NavLink to="/admin/mentors" className={cls}>Mentors</NavLink>
        <NavLink to="/admin/payouts" className={cls}>Payouts</NavLink>
        <NavLink to="/admin/settings" className={cls}>Settings</NavLink>
      </>}
      <div style={{ marginLeft: "auto" }} className="hstack">
        <NotificationBell />
        <span className="muted" style={{ fontSize: 12 }}>{user.fullName} · {user.role}</span>
        <ThemeToggle />
        <button className="secondary sm" onClick={async () => { await logout(); nav("/login"); }}>Log out</button>
      </div>
    </div>
  );
}

function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={dashboardPath(user.role)} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterChooser />} />
        <Route path="/register/client" element={<RegisterClient />} />
        <Route path="/register/doer" element={<RegisterDoer />} />
        <Route path="/register/mentor" element={<RegisterMentor />} />

        <Route path="/client" element={<RequireRole roles={["client"]}><ClientDashboard /></RequireRole>} />
        <Route path="/client/new" element={<RequireRole roles={["client"]}><NewAssignment /></RequireRole>} />
        <Route path="/client/assignments/:id" element={<RequireRole roles={["client"]}><AssignmentDetail /></RequireRole>} />

        <Route path="/doer" element={<RequireRole roles={["doer"]}><DoerDashboard /></RequireRole>} />
        <Route path="/doer/available/:id" element={<RequireRole roles={["doer"]}><AvailableDetail /></RequireRole>} />
        <Route path="/doer/tasks/:id" element={<RequireRole roles={["doer"]}><TaskDetail /></RequireRole>} />

        <Route path="/mentor" element={<RequireRole roles={["mentor"]}><MentorDashboard /></RequireRole>} />

        <Route path="/mentors" element={<RequireRole roles={["client", "doer", "admin", "mentor"]}><MentorList /></RequireRole>} />
        <Route path="/mentors/:id" element={<RequireRole roles={["client", "doer", "admin", "mentor"]}><MentorDetail /></RequireRole>} />
        <Route path="/bookings/:id" element={<RequireRole roles={["client", "doer", "mentor", "admin"]}><BookingDetail /></RequireRole>} />
        <Route path="/bookings" element={<RequireRole roles={["client", "doer"]}><MyBookings /></RequireRole>} />

        <Route path="/admin" element={<RequireRole roles={["admin"]}><AdminDashboard /></RequireRole>} />
        <Route path="/admin/assignments" element={<RequireRole roles={["admin"]}><AdminAssignments /></RequireRole>} />
        <Route path="/admin/assignments/:id" element={<RequireRole roles={["admin"]}><AdminAssignmentDetail /></RequireRole>} />
        <Route path="/admin/doers" element={<RequireRole roles={["admin"]}><AdminDoers /></RequireRole>} />
        <Route path="/admin/mentors" element={<RequireRole roles={["admin"]}><AdminMentors /></RequireRole>} />
        <Route path="/admin/payouts" element={<RequireRole roles={["admin"]}><AdminPayouts /></RequireRole>} />
        <Route path="/admin/settings" element={<RequireRole roles={["admin"]}><AdminSettings /></RequireRole>} />

        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

function NotFound() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading…</div>;
  return <Navigate to={user ? dashboardPath(user.role) : "/"} replace />;
}
