import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../../api.js";
import { useToast, useConfirm } from "../../toast.jsx";

function fmtDateLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return {
    dow: d.toLocaleDateString(undefined, { weekday: "short" }),
    dnum: d.getDate(),
    dmon: d.toLocaleDateString(undefined, { month: "short" }),
  };
}

export default function MentorDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [topic, setTopic] = useState("");
  const [activeDate, setActiveDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get(`/mentors/${id}`)
      .then((r) => {
        setData(r.data);
        const firstDate = Object.keys(r.data.slotsByDate || {}).sort()[0];
        setActiveDate((prev) => prev || firstDate || null);
      })
      .catch((e) => setErr(e.response?.data?.error || "Failed to load"));

  useEffect(() => { load(); }, [id]);

  const dates = useMemo(() => data ? Object.keys(data.slotsByDate || {}).sort() : [], [data]);
  const slotsForActive = activeDate && data ? (data.slotsByDate[activeDate] || []) : [];

  if (err) return <div className="container"><div className="error">{err}</div></div>;
  if (!data) return <div className="container"><div className="muted">Loading…</div></div>;

  const { mentor } = data;
  const rate = mentor.mentorProfile.hourlyRate;

  const book = async () => {
    if (!selectedSlot) return toast.error("Pick a time slot first");
    const go = await confirm({
      title: `Book ${mentor.fullName}?`,
      message: `${activeDate} · ${selectedSlot.startTime}–${selectedSlot.endTime}. You'll be charged ₹${rate} now (mock payment).`,
      confirmLabel: `Book & Pay ₹${rate}`,
    });
    if (!go) return;
    setBusy(true);
    try {
      const r = await api.post("/payments/book-and-capture", {
        slotId: selectedSlot.id,
        mentorId: mentor.id,
        topic,
      });
      toast.success("Booking confirmed. Meeting link ready.");
      nav(`/bookings/${r.data.booking.id}`);
    } catch (e) {
      toast.error(e.response?.data?.error || "Booking failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-narrow">
      <Link to="/mentors" className="muted">← Back to mentors</Link>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="hstack" style={{ gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 22, fontWeight: 700,
          }}>{mentor.fullName[0]}</div>
          <div>
            <h2 style={{ margin: 0 }}>{mentor.fullName}</h2>
            <div className="muted">{mentor.mentorProfile.headline}</div>
            <div className="dim">
              ⭐ {Number(mentor.mentorProfile.rating).toFixed(1)} · {mentor.mentorProfile.totalSessions} sessions · {mentor.mentorProfile.institution}
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>₹{rate}</div>
            <div className="dim">per session</div>
          </div>
        </div>
        <hr />
        <p>{mentor.mentorProfile.bio}</p>
        {mentor.mentorProfile.expertiseAreas.split(",").map((t) => t && <span key={t} className="tag">{t.trim()}</span>)}
      </div>

      <div className="card">
        <h3>Pick a date</h3>
        {dates.length === 0 ? (
          <div className="empty">
            <strong>No open slots right now.</strong>
            Check back later, or try another mentor.
          </div>
        ) : (
          <>
            <div className="date-strip">
              {dates.map((d) => {
                const l = fmtDateLabel(d);
                return (
                  <button
                    key={d}
                    className={`date-chip ${activeDate === d ? "active" : ""}`}
                    onClick={() => { setActiveDate(d); setSelectedSlot(null); }}
                    type="button"
                  >
                    <div className="dow">{l.dow}</div>
                    <div className="dnum">{l.dnum}</div>
                    <div className="dmon">{l.dmon}</div>
                  </button>
                );
              })}
            </div>

            <h3 style={{ marginTop: 16 }}>Time slots — {activeDate}</h3>
            <div className="time-grid">
              {slotsForActive.map((s) => (
                <button
                  key={s.id}
                  className={`time-chip ${selectedSlot?.id === s.id ? "active" : ""}`}
                  onClick={() => setSelectedSlot(s)}
                  type="button"
                >
                  {s.startTime}–{s.endTime}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <label>What do you want to discuss?</label>
              <textarea
                rows={2}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. JEE rank advice; resume review for FAANG internships"
              />
            </div>

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={book} disabled={!selectedSlot || busy}>
                {busy ? <><span className="spinner" /> Processing…</> : `Book & Pay ₹${rate}`}
              </button>
              {selectedSlot && (
                <div className="muted">{activeDate} · {selectedSlot.startTime}–{selectedSlot.endTime}</div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ fontSize: 12 }}>
        <div className="dim">
          Heads up: all mentor sessions happen on a platform-issued meeting link. Please don't share personal
          contact details or attempt to move the session off-platform — doing so violates the mentor agreement
          and is reportable to admin.
        </div>
      </div>
    </div>
  );
}
