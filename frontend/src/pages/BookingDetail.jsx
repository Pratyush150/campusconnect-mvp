import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useToast, useConfirm } from "../toast.jsx";
import ReviewForm from "../components/ReviewForm.jsx";
import ReviewBlock from "../components/ReviewBlock.jsx";

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [b, setB] = useState(null);
  const [err, setErr] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState("idle");
  const [myReviews, setMyReviews] = useState([]);
  const saveTimer = useRef(null);

  const load = () =>
    api.get(`/mentors/bookings/${id}`)
      .then((r) => {
        setB(r.data.booking);
        if (notes === "") setNotes(r.data.booking.sessionNotes || "");
      })
      .catch((e) => setErr(e.response?.data?.error || "Failed"));

  useEffect(() => { load(); }, [id]);
  useEffect(() => { api.get("/reviews/mine").then((r) => setMyReviews(r.data.reviews)).catch(() => {}); }, []);

  const alreadyReviewed = myReviews.some((r) => r.type === "mentor_session" && r.referenceId === id);

  useEffect(() => {
    if (!b || b.mentorId !== user?.id) return;
    if (notes === (b.sessionNotes || "")) return;
    setSaving("dirty");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving("saving");
      try {
        await api.patch(`/mentors/bookings/${id}/notes`, { notes });
        setSaving("saved");
        setTimeout(() => setSaving("idle"), 1200);
      } catch (e) {
        setSaving("error");
        toast.error("Couldn't save notes");
      }
    }, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [notes, b?.mentorId, user?.id]);

  if (err) return <div className="container"><div className="error">{err}</div></div>;
  if (!b) return <div className="container"><div className="muted">Loading…</div></div>;

  const isMentor = b.mentorId === user?.id;
  const isStudent = b.studentId === user?.id;
  const canJoin = Boolean(b.meetingLink);

  const complete = async () => {
    const go = await confirm({ title: "Mark session completed?", message: "Payment releases to you after this." });
    if (!go) return;
    try {
      await api.put(`/mentors/bookings/${id}/complete`);
      toast.success("Session marked complete. Payout queued.");
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
  };

  const cancel = async () => {
    const go = await confirm({
      title: "Cancel booking?", message: "If outside the free-cancellation window you may be charged 50%.",
      danger: true, confirmLabel: "Yes, cancel",
    });
    if (!go) return;
    try {
      const r = await api.delete(`/mentors/bookings/${id}/cancel`);
      toast.info(r.data.freeCancellation ? "Fully refunded." : "50% may be charged per policy.");
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
  };

  const statusLine = (
    <>
      <span className={`tag ${b.status}`}>{b.status.replace(/_/g, " ")}</span>
      <span className="muted"> · {b.slot.slotDate} {b.slot.startTime}–{b.slot.endTime}</span>
      <span className="muted"> · {b.durationMin} min</span>
    </>
  );

  return (
    <div className="container-narrow">
      <Link to={isMentor ? "/mentor" : "/mentors"} className="muted">← Back</Link>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="hstack">
          <h2 style={{ margin: 0 }}>Session with {isMentor ? b.student.fullName : b.mentor.fullName}</h2>
        </div>
        <div>{statusLine}</div>
        {b.topic && <p style={{ marginTop: 10 }}><strong>Topic:</strong> {b.topic}</p>}

        {canJoin && (
          <div style={{ marginTop: 12 }}>
            <a href={b.meetingLink} target="_blank" rel="noreferrer">
              <button className="success">🎥 Join video call</button>
            </a>
            <span className="dim" style={{ marginLeft: 10 }}>Opens Jitsi in a new tab · no install required</span>
          </div>
        )}

        <div style={{ marginTop: 14 }} className="hstack">
          {isMentor && b.status === "confirmed" && <button onClick={complete}>Mark complete</button>}
          {isStudent && ["confirmed", "pending_payment"].includes(b.status) && <button className="destructive sm" onClick={cancel}>Cancel booking</button>}
        </div>
      </div>

      {isStudent && ["confirmed", "completed"].includes(b.status) && !alreadyReviewed && (
        <ReviewForm
          type="mentor_session"
          referenceId={id}
          label={`Review your session with ${b.mentor.fullName}`}
          onSubmitted={() => {
            api.get("/reviews/mine").then((r) => setMyReviews(r.data.reviews)).catch(() => {});
            load();
          }}
        />
      )}
      {isStudent && alreadyReviewed && <div className="card muted">✓ You've already reviewed this session.</div>}

      <div className="notes-pane">
        <div className="hstack" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>📝 Session notes</h3>
          {isMentor && (
            <span className="notes-status">
              {saving === "idle" && (b.sessionNotesUpdatedAt ? `Last saved ${new Date(b.sessionNotesUpdatedAt).toLocaleTimeString()}` : "")}
              {saving === "dirty" && "Editing…"}
              {saving === "saving" && <><span className="spinner" /> Saving…</>}
              {saving === "saved" && "✓ Saved"}
              {saving === "error" && <span className="error">Couldn't save</span>}
            </span>
          )}
          {!isMentor && b.sessionNotesUpdatedAt && (
            <span className="notes-status">Updated {new Date(b.sessionNotesUpdatedAt).toLocaleString()}</span>
          )}
        </div>
        {isMentor ? (
          <>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write notes here during the session. They save automatically and are visible to your student."
            />
            <div className="dim" style={{ marginTop: 6 }}>Tip: Markdown is preserved. Students see this read-only.</div>
          </>
        ) : (
          notes.trim()
            ? <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>{notes}</pre>
            : <div className="empty"><strong>Your mentor hasn't written notes yet.</strong>They'll appear here during or after the session.</div>
        )}
      </div>
    </div>
  );
}
