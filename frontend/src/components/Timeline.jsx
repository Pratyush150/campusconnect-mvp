import { TIMELINE_STEPS, statusToStepIndex } from "../lib/assignmentStatus.js";

export default function Timeline({ assignment, compact = false }) {
  const idx = statusToStepIndex(assignment);
  const isDisputed = ["disputed", "cancelled", "refunded"].includes(assignment?.status);
  return (
    <div className="timeline" aria-label="Assignment progress">
      {TIMELINE_STEPS.map((step, i) => {
        let cls = "timeline-step";
        if (isDisputed) cls += " disputed";
        else if (i < idx) cls += " done";
        else if (i === idx) cls += " current";
        return (
          <div key={step.key} className={cls}>
            <div className="timeline-dot">{i < idx || isDisputed ? "✓" : i + 1}</div>
            {!compact && <div className="timeline-label">{step.label}</div>}
          </div>
        );
      })}
    </div>
  );
}
