import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";

export default function MentorList() {
  const [mentors, setMentors] = useState([]);
  useEffect(() => { api.get("/mentors").then((r) => setMentors(r.data.mentors)); }, []);
  return (
    <div className="container">
      <h2>Mentors</h2>
      {mentors.length === 0 && <div className="card muted">No approved mentors yet.</div>}
      {mentors.map((m) => (
        <Link key={m.id} to={`/mentors/${m.id}`} style={{ color: "inherit" }}>
          <div className="card">
            <h3>{m.fullName}</h3>
            <div className="muted">{m.mentorProfile.headline} · ⭐ {m.mentorProfile.rating.toFixed(1)} ({m.mentorProfile.totalSessions} sessions)</div>
            <p>{m.mentorProfile.bio}</p>
            {m.mentorProfile.expertiseAreas.split(",").map((t) => t && <span key={t} className="tag">{t.trim()}</span>)}
            <div style={{ marginTop: 8 }}>
              <strong>₹{m.mentorProfile.hourlyRate}/session</strong>
              {m.mentorProfile.monthlySubRate && <> · ₹{m.mentorProfile.monthlySubRate}/month</>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
