import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useAuth } from "../../auth.jsx";
import { useToast, useConfirm } from "../../toast.jsx";

const WEEKDAYS = [
  { i: 0, lbl: "Sun" }, { i: 1, lbl: "Mon" }, { i: 2, lbl: "Tue" },
  { i: 3, lbl: "Wed" }, { i: 4, lbl: "Thu" }, { i: 5, lbl: "Fri" }, { i: 6, lbl: "Sat" },
];

function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDaysISO(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

export default function MentorDashboard() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bulk, setBulk] = useState({
    startDate: todayISO(),
    endDate: addDaysISO(13),
    weekdays: [1, 2, 3, 4, 5],
    times: [{ start: "10:00", end: "11:00" }, { start: "14:00", end: "15:00" }],
    durationMin: 60,
  });
  const [quick, setQuick] = useState({ date: addDaysISO(1), startTime: "10:00", endTime: "11:00" });
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (user?.role !== "mentor" || !profile?.isApproved) return;
    api.get("/mentors/slots/mine").then((r) => setSlots(r.data.slots)).catch(() => {});
    api.get("/mentors/bookings/mine").then((r) => setBookings(r.data.bookings)).catch(() => {});
  };
  useEffect(() => { load(); }, [user?.role, profile?.isApproved]);

  const slotsByDate = useMemo(() => {
    const m = {};
    for (const s of slots) (m[s.slotDate] ||= []).push(s);
    return m;
  }, [slots]);

  if (!profile?.isApproved) {
    return (
      <div className="container-narrow">
        <div className="card empty">
          <strong>Awaiting approval</strong>
          Admin will activate your mentor profile soon. Once approved, you can create slots and accept bookings.
        </div>
      </div>
    );
  }

  const addQuick = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post("/mentors/slots", { slots: [quick] });
      if (r.data.created > 0) toast.success("Slot added");
      else toast.info("No new slot (may be duplicate)");
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
    finally { setBusy(false); }
  };

  const addBulk = async (e) => {
    e.preventDefault();
    if (!bulk.times.length) return toast.error("Add at least one time window");
    setBusy(true);
    try {
      const r = await api.post("/mentors/slots/bulk", bulk);
      toast.success(`Created ${r.data.created} slots`);
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
    finally { setBusy(false); }
  };

  const toggleWeekday = (i) => {
    setBulk((b) => ({ ...b, weekdays: b.weekdays.includes(i) ? b.weekdays.filter((x) => x !== i) : [...b.weekdays, i].sort() }));
  };

  const addTimeRow = () => setBulk((b) => ({ ...b, times: [...b.times, { start: "16:00", end: "17:00" }] }));
  const updateTime = (i, key, val) => setBulk((b) => {
    const times = [...b.times]; times[i] = { ...times[i], [key]: val };
    return { ...b, times };
  });
  const removeTime = (i) => setBulk((b) => ({ ...b, times: b.times.filter((_, idx) => idx !== i) }));

  const del = async (id) => {
    const go = await confirm({ title: "Delete this slot?", danger: true });
    if (!go) return;
    try {
      await api.delete(`/mentors/slots/${id}`);
      toast.success("Slot deleted");
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
  };

  return (
    <div className="container">
      <h2>Mentor dashboard</h2>
      <div className="muted">Welcome back, {user.fullName}. You have {bookings.filter(b => b.status === "confirmed").length} upcoming sessions.</div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>⚡ Quick add — one slot</h3>
          <form onSubmit={addQuick} className="stack">
            <div className="grid3">
              <div><label>Date</label><input type="date" value={quick.date} onChange={(e) => setQuick({ ...quick, date: e.target.value })} min={todayISO()} required /></div>
              <div><label>Start</label><input type="time" value={quick.startTime} onChange={(e) => setQuick({ ...quick, startTime: e.target.value })} required /></div>
              <div><label>End</label><input type="time" value={quick.endTime} onChange={(e) => setQuick({ ...quick, endTime: e.target.value })} required /></div>
            </div>
            <button type="submit" disabled={busy}>{busy ? <><span className="spinner" /> Adding…</> : "+ Add slot"}</button>
          </form>
        </div>

        <div className="card">
          <h3>📅 Bulk — fill a calendar range</h3>
          <form onSubmit={addBulk} className="stack">
            <div className="grid2">
              <div><label>From</label><input type="date" value={bulk.startDate} onChange={(e) => setBulk({ ...bulk, startDate: e.target.value })} min={todayISO()} required /></div>
              <div><label>To</label><input type="date" value={bulk.endDate} onChange={(e) => setBulk({ ...bulk, endDate: e.target.value })} required /></div>
            </div>
            <div>
              <label>Weekdays</label>
              <div className="hstack" style={{ flexWrap: "wrap", gap: 6 }}>
                {WEEKDAYS.map((w) => (
                  <button type="button" key={w.i}
                    className={`sm ${bulk.weekdays.includes(w.i) ? "" : "secondary"}`}
                    onClick={() => toggleWeekday(w.i)}
                  >{w.lbl}</button>
                ))}
              </div>
            </div>
            <div>
              <label>Time windows per day</label>
              <div className="stack" style={{ gap: 6 }}>
                {bulk.times.map((t, i) => (
                  <div key={i} className="hstack">
                    <input type="time" value={t.start} onChange={(e) => updateTime(i, "start", e.target.value)} />
                    <span className="muted">–</span>
                    <input type="time" value={t.end} onChange={(e) => updateTime(i, "end", e.target.value)} />
                    <button type="button" className="ghost sm" onClick={() => removeTime(i)}>✕</button>
                  </div>
                ))}
              </div>
              <button type="button" className="secondary sm" style={{ marginTop: 6 }} onClick={addTimeRow}>+ Add window</button>
            </div>
            <button type="submit" disabled={busy}>{busy ? <><span className="spinner" /> Creating…</> : "Create slots"}</button>
          </form>
        </div>
      </div>

      <h3 style={{ marginTop: 24 }}>Your slots</h3>
      {Object.keys(slotsByDate).length === 0 && (
        <div className="empty"><strong>No slots yet.</strong>Use Quick add or Bulk above to open availability.</div>
      )}
      {Object.keys(slotsByDate).sort().map((date) => (
        <div key={date} className="card">
          <strong>{date}</strong> <span className="muted">· {slotsByDate[date].length} slot{slotsByDate[date].length !== 1 ? "s" : ""}</span>
          <div className="hstack" style={{ flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {slotsByDate[date].map((s) => (
              <div key={s.id} className="hstack" style={{
                gap: 4, padding: "4px 6px 4px 10px",
                background: s.isBooked ? "var(--chip-assigned)" : "var(--panel-2)",
                borderRadius: 6, border: "1px solid var(--border)",
              }}>
                <span>{s.startTime}–{s.endTime}</span>
                {s.isBooked && <span className="tag confirmed sm">booked</span>}
                {!s.isBooked && <button className="ghost sm" onClick={() => del(s.id)}>✕</button>}
              </div>
            ))}
          </div>
        </div>
      ))}

      <h3 style={{ marginTop: 24 }}>Bookings</h3>
      {bookings.length === 0 && <div className="empty"><strong>No bookings yet.</strong>Your first booking will show up here.</div>}
      {bookings.map((b) => (
        <Link key={b.id} to={`/bookings/${b.id}`} style={{ color: "inherit" }}>
          <div className="card">
            <div className="hstack">
              <span className={`tag ${b.status}`}>{b.status.replace(/_/g, " ")}</span>
              <strong>{b.slot.slotDate} {b.slot.startTime}</strong>
              <span className="muted">with {b.student.fullName} ({b.student.role})</span>
              <span style={{ marginLeft: "auto" }} className="dim">Open →</span>
            </div>
            {b.topic && <div className="muted" style={{ marginTop: 4 }}>{b.topic}</div>}
          </div>
        </Link>
      ))}
    </div>
  );
}
