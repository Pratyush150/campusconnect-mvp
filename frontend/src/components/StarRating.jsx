import { useState } from "react";

export function StarReadout({ value, count }) {
  const v = Number(value || 0);
  const filled = Math.round(v);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <span style={{ color: "#fbbf24", letterSpacing: 1 }}>
        {"★".repeat(filled)}{"☆".repeat(5 - filled)}
      </span>
      <span className="muted" style={{ fontSize: 12.5 }}>
        {v ? v.toFixed(1) : "—"}{count != null && ` · ${count} review${count === 1 ? "" : "s"}`}
      </span>
    </span>
  );
}

export function StarPicker({ value, onChange, size = 22 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[1,2,3,4,5].map((n) => (
        <button
          key={n} type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: "transparent", border: 0, cursor: "pointer", padding: 0,
            color: (hover || value) >= n ? "#fbbf24" : "var(--border-2)",
            fontSize: size, lineHeight: 1, transition: "color 0.1s",
          }}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >★</button>
      ))}
    </div>
  );
}
