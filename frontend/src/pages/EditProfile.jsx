import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function EditProfile() {
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: "", college: "", bio: "", skills: "", avatarUrl: "",
    year: "", major: "", github: "", linkedin: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        college: user.college || "",
        bio: user.bio || "",
        skills: user.skills || "",
        avatarUrl: user.avatarUrl || "",
        year: user.year ?? "",
        major: user.major || "",
        github: user.github || "",
        linkedin: user.linkedin || "",
      });
    }
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setErr("");
    try {
      await api.patch("/users/me", { ...form, year: form.year === "" ? null : Number(form.year) });
      await refresh?.();
      nav(`/profile/${user.id}`);
    } catch (e) {
      setErr(e.response?.data?.error || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h2>Edit profile</h2>
      <form onSubmit={save}>
        <label className="muted">Name</label>
        <input value={form.name} onChange={set("name")} required />
        <div style={{ height: 8 }} />
        <div className="grid2">
          <div>
            <label className="muted">College</label>
            <input value={form.college} onChange={set("college")} />
          </div>
          <div>
            <label className="muted">Major</label>
            <input value={form.major} onChange={set("major")} />
          </div>
        </div>
        <div style={{ height: 8 }} />
        <label className="muted">Year</label>
        <input type="number" min="1" max="6" value={form.year} onChange={set("year")} />
        <div style={{ height: 8 }} />
        <label className="muted">Bio</label>
        <textarea rows={3} value={form.bio} onChange={set("bio")} />
        <div style={{ height: 8 }} />
        <label className="muted">Skills (comma-separated)</label>
        <input value={form.skills} onChange={set("skills")} />
        <div style={{ height: 8 }} />
        <label className="muted">Avatar URL</label>
        <input value={form.avatarUrl} onChange={set("avatarUrl")} placeholder="https://…" />
        <div style={{ height: 8 }} />
        <div className="grid2">
          <div>
            <label className="muted">GitHub username</label>
            <input value={form.github} onChange={set("github")} />
          </div>
          <div>
            <label className="muted">LinkedIn URL</label>
            <input value={form.linkedin} onChange={set("linkedin")} />
          </div>
        </div>
        {err && <div className="error">{err}</div>}
        <div style={{ height: 12 }} />
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" className="secondary" style={{ marginLeft: 8 }} onClick={() => nav(-1)}>Cancel</button>
      </form>
    </div>
  );
}
