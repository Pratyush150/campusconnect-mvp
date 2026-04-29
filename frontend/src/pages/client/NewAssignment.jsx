import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api.js";
import { useToast } from "../../toast.jsx";

const CATEGORIES = [
  {
    key: "assignments_essays",
    label: "Assignments / Essay Writing",
    desc: "Homework, write-ups, lab reports, term papers.",
    icon: "📝",
  },
  {
    key: "ed_drawing",
    label: "Engineering Drawing / Drawings",
    desc: "ED sheets, technical drawings, hand-drawn art.",
    icon: "📐",
  },
  {
    key: "projects",
    label: "Major / Minor Project Help",
    desc: "Final-year projects, code, prototypes, theses.",
    icon: "🛠️",
  },
  {
    key: "custom",
    label: "Custom Requirement",
    desc: "Doesn't fit the above? Describe what you need.",
    icon: "✨",
  },
];

export default function NewAssignment() {
  const nav = useNavigate();
  const toast = useToast();
  const fileInput = useRef();
  const [form, setForm] = useState({
    title: "", description: "", subject: "", assignmentType: "homework",
    deadline: defaultDeadline(),
    budgetMin: "", budgetMax: "",
    isHandwritten: false, handwrittenExtra: "",
    category: "", customCategoryNote: "",
  });
  const [attached, setAttached] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Pull budget percentiles whenever category changes (debounced unnecessary — it's category-driven, infrequent).
  useEffect(() => {
    if (!form.category) { setStats(null); return; }
    setStatsLoading(true);
    api.get("/assignments/budget-stats", { params: { category: form.category } })
      .then((r) => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [form.category]);

  const verdict = useMemo(() => computeVerdict(form.budgetMax, stats), [form.budgetMax, stats]);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    try {
      const r = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAttached((prev) => [...prev, ...r.data.files]);
      toast.success(`${r.data.files.length} file${r.data.files.length === 1 ? "" : "s"} attached`);
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) { toast.error(e.response?.data?.error || "Upload failed"); }
    finally { setUploading(false); }
  };

  const removeFile = (idx) => setAttached((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.category) { toast.error("Pick a category for the work"); return; }
    if (form.category === "custom" && !form.customCategoryNote.trim()) {
      toast.error("Describe what kind of custom work this is"); return;
    }
    if (!form.budgetMax) { toast.error("Maximum budget is required"); return; }
    if (form.isHandwritten && !form.handwrittenExtra) {
      toast.error("Specify the extra notes charge for handwritten work"); return;
    }
    setBusy(true);
    try {
      const body = {
        ...form,
        deadline: new Date(form.deadline).toISOString(),
        budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
        budgetMax: Number(form.budgetMax),
        handwrittenExtra: form.handwrittenExtra ? Number(form.handwrittenExtra) : null,
        attachments: attached,
      };
      const r = await api.post("/assignments/request", body);
      toast.success("Submitted for admin review.");
      nav(`/client/assignments/${r.data.assignment.id}`);
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <Link to="/client" className="muted">← My assignments</Link>
      <div className="page-head" style={{ marginTop: 6 }}>
        <div>
          <h2>Post a requirement</h2>
          <div className="page-sub">Admin reviews and anonymizes before doers see it.</div>
        </div>
      </div>
      <div className="card">
        <form onSubmit={submit}>
          {/* Category picker */}
          <label className="required" style={{ marginBottom: 10 }}>Category of work</label>
          <div className="cat-grid">
            {CATEGORIES.map((c) => {
              const selected = form.category === c.key;
              return (
                <button
                  key={c.key} type="button"
                  className={`cat-card ${selected ? "selected" : ""}`}
                  onClick={() => setForm({ ...form, category: c.key })}
                  aria-pressed={selected}
                >
                  <div className="cat-icon" aria-hidden="true">{c.icon}</div>
                  <div className="cat-title">{c.label}</div>
                  <div className="cat-desc">{c.desc}</div>
                </button>
              );
            })}
          </div>
          {form.category === "custom" && (
            <div style={{ marginTop: 10 }}>
              <label className="required">Describe the custom requirement</label>
              <textarea rows={3}
                placeholder="What kind of help do you need? Be specific so admin can route this correctly."
                value={form.customCategoryNote}
                onChange={(e) => setForm({ ...form, customCategoryNote: e.target.value })} />
            </div>
          )}

          <label className="required" style={{ marginTop: 16 }}>Title</label>
          <input value={form.title} placeholder="e.g. 1500-word essay on game theory" onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <label className="required">Description</label>
          <textarea rows={6} placeholder="What needs to be done? Word count, format, references…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />

          <div className="grid2">
            <div>
              <label>Subject</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label>Sub-type</label>
              <select value={form.assignmentType} onChange={(e) => setForm({ ...form, assignmentType: e.target.value })}>
                {["homework", "project", "thesis", "lab_report", "essay", "code", "other"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <label className="required">Deadline</label>
          <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />

          <div className="grid2">
            <div>
              <label>Budget min (₹)</label>
              <input type="number" min="0" placeholder="optional" value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} />
            </div>
            <div>
              <label className="required">Budget max (₹)</label>
              <input type="number" min="100" placeholder="e.g. 1500" value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} required />
            </div>
          </div>

          {/* Budget probability indicator */}
          <BudgetIndicator
            category={form.category}
            budgetMax={form.budgetMax}
            stats={stats}
            loading={statsLoading}
            verdict={verdict}
            onApply={(v) => setForm((f) => ({ ...f, budgetMax: String(v) }))}
          />

          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Doers won't bid above your max. You'll only see bids that fit your range.
          </div>

          {/* Handwritten toggle */}
          <div style={{ marginTop: 16, padding: 14, border: "1px solid var(--border)", borderRadius: 10, background: "var(--panel-2)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, textTransform: "none", letterSpacing: 0, fontSize: 14, marginBottom: 0, cursor: "pointer" }}>
              <input
                type="checkbox" style={{ width: "auto", margin: 0 }}
                checked={form.isHandwritten}
                onChange={(e) => setForm({ ...form, isHandwritten: e.target.checked, handwrittenExtra: e.target.checked ? form.handwrittenExtra : "" })}
              />
              <span><strong>This is handwritten work</strong> — paper notes, copies etc.</span>
            </label>
            {form.isHandwritten && (
              <div style={{ marginTop: 10 }}>
                <label className="required">Extra notes / paper charge (₹)</label>
                <input type="number" min="0" placeholder="e.g. 200" value={form.handwrittenExtra}
                       onChange={(e) => setForm({ ...form, handwrittenExtra: e.target.value })} required />
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  This is an upfront supplement on top of the bid — covers paper, photographs, courier etc. Doers see it before bidding.
                </div>
              </div>
            )}
          </div>

          {/* File upload */}
          <div style={{ marginTop: 16 }}>
            <label>Attachments <span className="muted">(reference materials, brief, syllabus — up to 10 files, 10 MB each)</span></label>
            <input type="file" multiple ref={fileInput} onChange={handleUpload} />
            {uploading && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}><span className="spinner" /> Uploading…</div>}
            {attached.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                {attached.map((f, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <a href={f.url} target="_blank" rel="noreferrer">{f.filename}</a>
                    <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>{Math.round(f.size / 1024)} KB</span>
                    <button type="button" className="link xs" style={{ marginLeft: 8 }} onClick={() => removeFile(i)}>remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
            Don't include phone, email, or messaging handles — the platform flags them to admin automatically.
          </div>
          <div style={{ height: 14 }} />
          <button type="submit" disabled={busy || uploading}>
            {busy ? <><span className="spinner" /> Submitting…</> : "Submit for review"}
          </button>
        </form>
      </div>
    </div>
  );
}

function BudgetIndicator({ category, budgetMax, stats, loading, verdict, onApply }) {
  const wrap = (children, extra = "") => (
    <div className={`budget-section ${extra}`} style={{ marginTop: 10 }}>
      <div className="budget-section-title">Bid likelihood</div>
      {children}
    </div>
  );

  if (!category) {
    return wrap(
      <div className="budget-hint muted">Pick a category above to see how competitive your budget looks.</div>
    );
  }
  if (loading) {
    return wrap(
      <div className="budget-hint muted"><span className="spinner" /> Checking market rates…</div>
    );
  }
  if (!stats) {
    return wrap(
      <div className="budget-hint muted">Couldn't load rate data. You can still post — admin will price-check.</div>
    );
  }

  if (!verdict) {
    // Stats loaded but no budget entered yet — surface the band the client should aim for.
    if (stats.p50 != null) {
      return wrap(
        <div className="budget-hint">
          <strong>Typical accepted:</strong> ₹{stats.p25.toLocaleString("en-IN")}–₹{stats.p75.toLocaleString("en-IN")}
          {" "}<span className="muted">(median ₹{stats.p50.toLocaleString("en-IN")}, n={stats.sampleSize})</span>
          {stats.recommendedTo && (
            <>
              {" · "}
              <button type="button" className="link xs" onClick={() => onApply(stats.recommendedTo)}>
                use ₹{stats.recommendedTo.toLocaleString("en-IN")}
              </button>
            </>
          )}
        </div>
      );
    }
    return wrap(
      <div className="budget-hint">
        <strong>Suggested floor:</strong> ₹{stats.floor.toLocaleString("en-IN")}
        {" "}<span className="muted">— enter your budget to see how competitive it looks.</span>
      </div>
    );
  }

  return wrap(
    <div className={`budget-verdict ${verdict.tone}`}>
      <span className="budget-dot" />
      <div style={{ flex: 1 }}>
        <div className="budget-verdict-title">{verdict.label}</div>
        <div className="budget-verdict-sub muted">{verdict.detail}</div>
      </div>
      {verdict.suggestedTarget != null && (
        <button type="button" className="link xs" onClick={() => onApply(verdict.suggestedTarget)}>
          use ₹{verdict.suggestedTarget.toLocaleString("en-IN")}
        </button>
      )}
    </div>
  );
}

function computeVerdict(budgetMax, stats) {
  if (!stats) return null;
  const amt = Number(budgetMax || 0);
  if (!amt) return null;

  // Prefer percentile-based once we have real data.
  if (stats.p50 != null) {
    if (amt < stats.p25) {
      return {
        tone: "lower",
        label: "Lower chance of bids at this price",
        detail: `Below the typical accepted range (₹${stats.p25.toLocaleString("en-IN")}–₹${stats.p75.toLocaleString("en-IN")}, median ₹${stats.p50.toLocaleString("en-IN")}, n=${stats.sampleSize}). Doers may skip it.`,
        suggestedTarget: stats.recommendedFrom,
      };
    }
    if (amt > stats.p75) {
      return {
        tone: "higher",
        label: "Higher chance of bids — strong budget",
        detail: `Above 75% of recent accepted bids (median ₹${stats.p50.toLocaleString("en-IN")}, n=${stats.sampleSize}). Expect quick interest.`,
        suggestedTarget: null,
      };
    }
    return {
      tone: "moderate",
      label: "Moderate chance of bids",
      detail: `Within the typical accepted range (median ₹${stats.p50.toLocaleString("en-IN")}, n=${stats.sampleSize}). Bids should arrive in a few hours.`,
      suggestedTarget: null,
    };
  }

  // Cold start: floor-based heuristic so the colored band still appears.
  const floor = stats.floor;
  if (amt < floor) {
    return {
      tone: "lower",
      label: "Lower chance — below the suggested floor",
      detail: `For this category, the suggested floor is ₹${floor.toLocaleString("en-IN")}. Doers may skip a budget below this.`,
      suggestedTarget: floor,
    };
  }
  if (amt < floor * 1.6) {
    return {
      tone: "moderate",
      label: "Moderate chance of bids",
      detail: `In line with the category baseline (₹${floor.toLocaleString("en-IN")}+). Once 5+ jobs complete in this category, this estimate switches to real market data.`,
      suggestedTarget: Math.round(floor * 1.4),
    };
  }
  return {
    tone: "higher",
    label: "Higher chance — strong budget",
    detail: `Comfortably above the category floor of ₹${floor.toLocaleString("en-IN")}. Expect interest from doers.`,
    suggestedTarget: null,
  };
}

function defaultDeadline() {
  const d = new Date(Date.now() + 3 * 86400 * 1000);
  return d.toISOString().slice(0, 16);
}
