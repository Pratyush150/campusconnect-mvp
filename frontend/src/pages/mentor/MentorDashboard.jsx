import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { useAuth } from "../../auth.jsx";

export default function MentorDashboard() {
  const { profile } = useAuth();
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [slot, setSlot] = useState({ date: defaultDate(), startTime: "10:00", endTime: "11:00" });
  const [msg, setMsg] = useState("");

  const load = () => {
    if (profile?.isApproved) {
      api.get("/mentors/slots/mine").then((r) => setSlots(r.data.slots));
      api.get("/mentors/bookings/mine").then((r) => setBookings(r.data.bookings));
    }
  };
  useEffect(() => { load(); }, [profile?.isApproved]);

  if (!profile?.isApproved) return <div className="container"><div className="card"><h2>Awaiting approval</h2><p className="muted">Admin will activate your profile soon.</p></div></div>;

  const addSlot = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await api.post("/mentors/slots", { slots: [slot] });
      load();
    } catch (e) { setMsg(e.response?.data?.error || "Failed"); }
  };

  const del = async (id) => {
    await api.delete(`/mentors/slots/${id}`);
    load();
  };

  const complete = async (id) => {
    await api.put(`/mentors/bookings/${id}/complete`);
    load();
  };

  return (
    <div className="container">
      <h2>My slots</h2>
      <div className="card">
        <form onSubmit={addSlot} className="grid3">
          <div><label>Date</label><input type="date" value={slot.date} onChange={(e) => setSlot({ ...slot, date: e.target.value })} required /></div>
          <div><label>Start</label><input type="time" value={slot.startTime} onChange={(e) => setSlot({ ...slot, startTime: e.target.value })} required /></div>
          <div><label>End</label><input type="time" value={slot.endTime} onChange={(e) => setSlot({ ...slot, endTime: e.target.value })} required /></div>
          <div style={{ gridColumn: "1 / -1", marginTop: 8 }}><button type="submit">+ Add slot</button></div>
        </form>
        {msg && <div className="error">{msg}</div>}
      </div>
      {slots.length === 0 && <div className="muted">No slots.</div>}
      {slots.map((s) => (
        <div key={s.id} className="card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <strong>{s.slotDate} {s.startTime}–{s.endTime}</strong>
          <span className={`tag ${s.isBooked ? "assigned" : "published"}`}>{s.isBooked ? "booked" : "open"}</span>
          {!s.isBooked && <button className="danger" onClick={() => del(s.id)} style={{ marginLeft: "auto" }}>Delete</button>}
        </div>
      ))}

      <h2>Bookings</h2>
      {bookings.length === 0 && <div className="muted">No bookings yet.</div>}
      {bookings.map((b) => (
        <div key={b.id} className="card">
          <span className={`tag ${b.status}`}>{b.status}</span>
          <strong>{b.slot.slotDate} {b.slot.startTime}</strong>
          <div className="muted">By {b.student.role} · {b.topic || "No topic"}</div>
          {b.meetingLink && <div className="muted">Link: {b.meetingLink}</div>}
          {b.status === "confirmed" && <button onClick={() => complete(b.id)} style={{ marginTop: 8 }}>Mark completed</button>}
        </div>
      ))}
    </div>
  );
}

function defaultDate() { return new Date(Date.now() + 86400000).toISOString().slice(0, 10); }
