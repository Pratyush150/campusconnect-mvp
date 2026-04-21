import { useEffect, useState } from "react";
import { api } from "../../api.js";

export default function AdminDoers() {
  const [doers, setDoers] = useState([]);
  const load = () => api.get("/admin/doers").then((r) => setDoers(r.data.doers));
  useEffect(() => { load(); }, []);
  const approve = async (id) => { await api.put(`/admin/users/${id}/approve-doer`); load(); };
  return (
    <div className="container">
      <h2>Doers</h2>
      <table className="table">
        <thead><tr><th>Name</th><th>Email</th><th>Skills</th><th>Rating</th><th>Approved</th><th></th></tr></thead>
        <tbody>
          {doers.map((d) => (
            <tr key={d.id}>
              <td>{d.fullName}</td>
              <td>{d.email}</td>
              <td>{d.doerProfile?.skills}</td>
              <td>{d.doerProfile?.rating}</td>
              <td>{d.doerProfile?.isApproved ? "✓" : "—"}</td>
              <td>{!d.doerProfile?.isApproved && <button onClick={() => approve(d.id)}>Approve</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
