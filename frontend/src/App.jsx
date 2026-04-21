import { Routes, Route, Navigate, NavLink, useNavigate, Link } from "react-router-dom";
import { AuthProvider, useAuth, dashboardPath } from "./auth.jsx";
import Login from "./pages/Login.jsx";
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

import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminAssignments from "./pages/admin/AdminAssignments.jsx";
import AdminAssignmentDetail from "./pages/admin/AdminAssignmentDetail.jsx";
import AdminDoers from "./pages/admin/AdminDoers.jsx";
import AdminMentors from "./pages/admin/AdminMentors.jsx";
import AdminPayouts from "./pages/admin/AdminPayouts.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";

function Nav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  if (!user) return null;
  const cls = ({ isActive }) => (isActive ? "active" : "");
  return (
    <div className="nav">
      <strong>AssignMentor</strong>
      {user.role === "client" && <>
        <NavLink to="/client" className={cls}>My assignments</NavLink>
        <NavLink to="/client/new" className={cls}>+ Post</NavLink>
        <NavLink to="/mentors" className={cls}>Mentors</NavLink>
      </>}
      {user.role === "doer" && <>
        <NavLink to="/doer" className={cls}>Dashboard</NavLink>
        <NavLink to="/mentors" className={cls}>Mentors</NavLink>
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
      <div style={{ marginLeft: "auto" }} className="muted">
        {user.fullName} ({user.role})
      </div>
      <button className="secondary" onClick={async () => { await logout(); nav("/login"); }}>Log out</button>
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

        <Route path="/admin" element={<RequireRole roles={["admin"]}><AdminDashboard /></RequireRole>} />
        <Route path="/admin/assignments" element={<RequireRole roles={["admin"]}><AdminAssignments /></RequireRole>} />
        <Route path="/admin/assignments/:id" element={<RequireRole roles={["admin"]}><AdminAssignmentDetail /></RequireRole>} />
        <Route path="/admin/doers" element={<RequireRole roles={["admin"]}><AdminDoers /></RequireRole>} />
        <Route path="/admin/mentors" element={<RequireRole roles={["admin"]}><AdminMentors /></RequireRole>} />
        <Route path="/admin/payouts" element={<RequireRole roles={["admin"]}><AdminPayouts /></RequireRole>} />
        <Route path="/admin/settings" element={<RequireRole roles={["admin"]}><AdminSettings /></RequireRole>} />

        <Route path="*" element={<Home />} />
      </Routes>
    </AuthProvider>
  );
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading…</div>;
  return <Navigate to={user ? dashboardPath(user.role) : "/login"} replace />;
}
