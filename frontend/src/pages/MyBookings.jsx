import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/mentors/my/bookings")
      .then((r) => setBookings(r.data.bookings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcoming = bookings.filter((b) => ["confirmed", "pending_payment"].includes(b.status));
  const past = bookings.filter((b) => !["confirmed", "pending_payment"].includes(b.status));

  return (
    <div className="container-narrow">
      <h2>My bookings</h2>
      <Link to="/mentors" className="muted">+ Book a new session</Link>

      <h3 style={{ marginTop: 20 }}>Upcoming</h3>
      {loading && <div className="muted">Loading…</div>}
      {!loading && upcoming.length === 0 && (
        <div className="empty"><strong>No upcoming sessions.</strong>Browse mentors to book one.</div>
      )}
      {upcoming.map((b) => (
        <Link key={b.id} to={`/bookings/${b.id}`} style={{ color: "inherit" }}>
          <div className="card">
            <div className="hstack">
              <span className={`tag ${b.status}`}>{b.status.replace(/_/g, " ")}</span>
              <strong>{b.slot.slotDate} · {b.slot.startTime}–{b.slot.endTime}</strong>
              <span className="muted">with {b.mentor.fullName}</span>
              <span style={{ marginLeft: "auto" }} className="dim">Open →</span>
            </div>
            <div className="muted" style={{ marginTop: 4 }}>{b.mentor.mentorProfile.headline}</div>
          </div>
        </Link>
      ))}

      <h3 style={{ marginTop: 24 }}>Past</h3>
      {!loading && past.length === 0 && <div className="muted">Nothing yet.</div>}
      {past.map((b) => (
        <Link key={b.id} to={`/bookings/${b.id}`} style={{ color: "inherit" }}>
          <div className="card">
            <div className="hstack">
              <span className={`tag ${b.status}`}>{b.status}</span>
              <strong>{b.slot.slotDate}</strong>
              <span className="muted">with {b.mentor.fullName}</span>
              {b.rating && <span className="muted">· {b.rating}⭐</span>}
              <span style={{ marginLeft: "auto" }} className="dim">Open →</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
