import { useEffect, useState } from "react";
import { api } from "../api.js";
import { StarReadout } from "./StarRating.jsx";
import { relativeTime } from "../lib/assignmentStatus.js";

export default function ReviewBlock({ userId, title = "Reviews" }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!userId) return;
    api.get(`/reviews/user/${userId}`).then((r) => setData(r.data)).catch(() => setData({ reviews: [], average: 0, count: 0 }));
  }, [userId]);

  if (!data) return null;

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <StarReadout value={data.average} count={data.count} />
      </div>
      {data.reviews.length === 0 && <div className="muted" style={{ marginTop: 10 }}>No reviews yet.</div>}
      {data.reviews.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {data.reviews.slice(0, 5).map((r) => (
            <div key={r.id} style={{ borderTop: "1px dashed var(--border)", paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <StarReadout value={r.rating} />
                <span className="muted" style={{ fontSize: 11 }}>{r.rater?.fullName} · {r.rater?.role} · {relativeTime(r.createdAt)}</span>
              </div>
              {r.text && <div style={{ marginTop: 4, fontSize: 14 }}>{r.text}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
