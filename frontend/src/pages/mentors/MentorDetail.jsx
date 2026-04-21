import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api.js";

export default function MentorDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [topic, setTopic] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => api.get(`/mentors/${id}`).then((r) => setData(r.data));
  useEffect(() => { load(); }, [id]);

  if (!data) return <div className="container muted">Loading…</div>;
  const { mentor, slots } = data;

  const book = async (slotId) => {
    setMsg("");
    try {
      const b = await api.post(`/mentors/${id}/book`, { slotId, topic });
      const bookingId = b.data.booking.id;
      const o = await api.post("/payments/create-order", { bookingId });
      await api.post("/payments/mock-capture", { paymentId: o.data.paymentId });
      setMsg("Booking confirmed + paid (mock).");
      load();
    } catch (e) { setMsg(e.response?.data?.error || "Failed"); }
  };

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <Link to="/mentors" className="muted">← Back</Link>
      <div className="card">
        <h2>{mentor.fullName}</h2>
        <div className="muted">{mentor.mentorProfile.headline} · ⭐ {mentor.mentorProfile.rating.toFixed(1)}</div>
        <p>{mentor.mentorProfile.bio}</p>
        {mentor.mentorProfile.expertiseAreas.split(",").map((t) => t && <span key={t} className="tag">{t.trim()}</span>)}
        <div style={{ marginTop: 8 }}>₹{mentor.mentorProfile.hourlyRate}/session</div>
      </div>

      <div className="card">
        <h3>Book a slot</h3>
        <label>What do you want to discuss?</label>
        <textarea rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. JEE rank advice" />
        {slots.length === 0 ? <div className="muted">No open slots.</div> : null}
        <div style={{ marginTop: 10 }}>
          {slots.map((s) => (
            <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
              <strong>{s.slotDate} {s.startTime}–{s.endTime}</strong>
              <button onClick={() => book(s.id)} style={{ marginLeft: "auto" }}>
                Book · ₹{mentor.mentorProfile.hourlyRate}
              </button>
            </div>
          ))}
        </div>
        {msg && <div className="ok">{msg}</div>}
      </div>
    </div>
  );
}
