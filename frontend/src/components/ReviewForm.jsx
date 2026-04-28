import { useState } from "react";
import { api } from "../api.js";
import { useToast } from "../toast.jsx";
import { StarPicker } from "./StarRating.jsx";

export default function ReviewForm({ type, referenceId, label = "Leave a review", onSubmitted }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { toast.error("Pick a rating"); return; }
    setBusy(true);
    try {
      await api.post("/reviews", { type, referenceId, rating, text });
      toast.success("Thanks for the review.");
      onSubmitted?.();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="card">
      <h3 style={{ marginTop: 0 }}>{label}</h3>
      <label>Rating</label>
      <StarPicker value={rating} onChange={setRating} />
      <label style={{ marginTop: 12 }}>What stood out? <span className="muted">(optional)</span></label>
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Be specific — your review helps others choose." />
      <div style={{ height: 12 }} />
      <button type="submit" disabled={busy}>{busy ? <><span className="spinner" /> Posting…</> : "Post review"}</button>
    </form>
  );
}
