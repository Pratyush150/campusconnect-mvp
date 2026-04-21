import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";

export default function MentorList() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/mentors")
      .then((r) => setMentors(r.data.mentors))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h2>Browse mentors</h2>
      <div className="muted" style={{ marginBottom: 14 }}>Book paid 1:1 sessions with vetted mentors. Pay on booking, join on a platform-issued Jitsi link.</div>
      {loading && <div className="muted">Loading…</div>}
      {!loading && mentors.length === 0 && (
        <div className="empty"><strong>No approved mentors yet.</strong>Admin is still reviewing applications.</div>
      )}
      <div className="grid2">
        {mentors.map((m) => (
          <Link key={m.id} to={`/mentors/${m.id}`} style={{ color: "inherit" }}>
            <div className="card">
              <div className="hstack">
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontWeight: 700,
                }}>{m.fullName[0]}</div>
                <div>
                  <strong>{m.fullName}</strong>
                  <div className="muted">{m.mentorProfile.headline}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ color: "var(--accent)", fontWeight: 700 }}>₹{m.mentorProfile.hourlyRate}</div>
                  <div className="dim">per session</div>
                </div>
              </div>
              <p style={{ marginTop: 10 }}>{m.mentorProfile.bio}</p>
              <div className="dim" style={{ marginBottom: 6 }}>
                ⭐ {Number(m.mentorProfile.rating).toFixed(1)} · {m.mentorProfile.totalSessions} sessions
              </div>
              {m.mentorProfile.expertiseAreas.split(",").map((t) => t && <span key={t} className="tag">{t.trim()}</span>)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
