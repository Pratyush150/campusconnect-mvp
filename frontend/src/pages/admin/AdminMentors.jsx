import { useEffect, useState } from "react";
import { api } from "../../api.js";

export default function AdminMentors() {
  const [mentors, setMentors] = useState([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => api.get("/admin/mentors").then((r) => setMentors(r.data.mentors));
  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await api.post("/admin/mentors/invite", { email });
      setMsg(`Invite sent. Link: ${r.data.url}`);
      setEmail("");
    } catch (e) { setMsg(e.response?.data?.error || "Failed"); }
  };

  const approve = async (id) => { await api.put(`/admin/mentors/${id}/approve`); load(); };
  const deactivate = async (id) => { await api.put(`/admin/mentors/${id}/deactivate`); load(); };

  return (
    <div className="container">
      <h2>Mentors</h2>
      <div className="card">
        <h3>Invite a mentor</h3>
        <form onSubmit={invite} className="row" style={{ maxWidth: 500 }}>
          <input type="email" placeholder="mentor@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" style={{ maxWidth: 140 }}>Send invite</button>
        </form>
        {msg && <div className="muted" style={{ marginTop: 8, wordBreak: "break-all" }}>{msg}</div>}
      </div>
      <table className="table">
        <thead><tr><th>Name</th><th>Headline</th><th>Rate</th><th>Approved</th><th></th></tr></thead>
        <tbody>
          {mentors.map((m) => (
            <tr key={m.id}>
              <td>{m.fullName}</td>
              <td>{m.mentorProfile?.headline}</td>
              <td>₹{m.mentorProfile?.hourlyRate}</td>
              <td>{m.mentorProfile?.isApproved ? "✓" : "—"}</td>
              <td>
                {!m.mentorProfile?.isApproved ? <button onClick={() => approve(m.id)}>Approve</button>
                  : <button className="danger" onClick={() => deactivate(m.id)}>Deactivate</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
