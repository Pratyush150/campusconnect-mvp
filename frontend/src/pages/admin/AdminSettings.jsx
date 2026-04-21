import { useEffect, useState } from "react";
import { api } from "../../api.js";

export default function AdminSettings() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const load = () => api.get("/admin/settings").then((r) => setRows(r.data.settings));
  useEffect(() => { load(); }, []);

  const save = async (k, raw) => {
    try {
      const parsed = JSON.parse(raw).value;
      await api.put(`/admin/settings/${k}`, { value: parsed });
      setMsg(`Saved ${k}`);
      load();
    } catch (e) { setMsg("Value must be JSON of {value:...}"); }
  };

  return (
    <div className="container">
      <h2>Platform settings</h2>
      <p className="muted">Each row is stored as JSON <code>{`{"value":...}`}</code>. Commission percents, limits, windows.</p>
      <table className="table">
        <thead><tr><th>Key</th><th>Value (JSON)</th><th>Updated</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <Row key={r.key} row={r} onSave={save} />
          ))}
        </tbody>
      </table>
      {msg && <div className="ok">{msg}</div>}
    </div>
  );
}

function Row({ row, onSave }) {
  const [val, setVal] = useState(row.value);
  return (
    <tr>
      <td><code>{row.key}</code></td>
      <td><input value={val} onChange={(e) => setVal(e.target.value)} /></td>
      <td className="muted">{new Date(row.updatedAt).toLocaleString()}</td>
      <td><button onClick={() => onSave(row.key, val)}>Save</button></td>
    </tr>
  );
}
