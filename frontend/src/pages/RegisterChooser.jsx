import { Link } from "react-router-dom";

const OPTIONS = [
  {
    to: "/register/client", icon: "📝", title: "Client",
    desc: "I need an assignment done — pay securely, receive the deliverable.",
  },
  {
    to: "/register/doer", icon: "✍️", title: "Doer",
    desc: "I want to bid on assignments and deliver work. Profile is admin-approved.",
  },
  {
    to: "/register/mentor", icon: "🎓", title: "Mentor",
    desc: "Invite-only. Verified mentors run paid 1:1 sessions with students.",
  },
];

export default function RegisterChooser() {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-bg" aria-hidden="true"><span className="blob" /></div>
        <div className="auth-brand-content">
          <h1>Join CampusConnect</h1>
          <div className="tagline">
            Choose how you want to use the platform. You can always make a second account for a different role.
          </div>
        </div>
        <div className="footnote">© CampusConnect · dev build</div>
      </aside>

      <main className="auth-form-pane">
        <div className="auth-form" style={{ maxWidth: 560 }}>
          <h2>Create your account</h2>
          <div className="sub">Pick the role that fits you.</div>

          <div className="role-cards">
            {OPTIONS.map((o) => (
              <Link key={o.to} to={o.to} className="role-card">
                <div className="role-icon" aria-hidden="true">{o.icon}</div>
                <h3>{o.title}</h3>
                <p>{o.desc}</p>
              </Link>
            ))}
          </div>

          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Mentor signup needs an invite link from admin. Admin accounts aren't public.
          </div>
          <div style={{ marginTop: 16 }}>
            <Link to="/login" className="muted">← Back to sign in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
