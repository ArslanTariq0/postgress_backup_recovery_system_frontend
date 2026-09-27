import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY_FORM = {
  name: "",
  host: "",
  port: 5432,
  db_name: "",
  db_username: "",
  db_password: "",
  ssl_mode: "prefer",
};

export default function Connections() {
  const [connections, setConnections] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [testResults, setTestResults] = useState({}); // id -> {ok, detail}

  async function load() {
    try {
      setConnections(await api.listConnections());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function createConnection(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    let created = null;
    try {
      // 1. Create the connection record.
      created = await api.createConnection({ ...form, port: Number(form.port) });

      // 2. Immediately verify it actually connects.
      const result = await api.testConnection(created.db_connection_id);

      if (!result.ok) {
        // 3. Roll back — don't leave a connection around that doesn't work.
        await api.deleteConnection(created.db_connection_id);
        setError(`Connection could not be verified, so it was not saved: ${result.detail}`);
        return;
      }

      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      // If creation itself failed, there's nothing to roll back.
      // If the test call itself errored (not just returned ok:false), still roll back the row we created.
      if (created) {
        try {
          await api.deleteConnection(created.db_connection_id);
        } catch {
          // best-effort cleanup; surface the original error either way
        }
      }
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function testConnection(id) {
    setTestResults((r) => ({ ...r, [id]: { loading: true } }));
    try {
      const result = await api.testConnection(id);
      setTestResults((r) => ({ ...r, [id]: result }));
    } catch (err) {
      setTestResults((r) => ({ ...r, [id]: { ok: false, detail: err.message } }));
    }
  }

  async function remove(id) {
    if (!confirm("Delete this connection? Its backup history stays, but you won't be able to run new backups against it.")) return;
    try {
      await api.deleteConnection(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">Database connections</h1>
      <p className="page-sub">Databases this tool can back up and restore into.</p>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        <h3>Add a connection</h3>
        <form onSubmit={createConnection}>
          <div className="row">
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="field">
              <label>SSL mode</label>
              <select value={form.ssl_mode} onChange={(e) => update("ssl_mode", e.target.value)}>
                <option value="disable">disable</option>
                <option value="prefer">prefer</option>
                <option value="require">require</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 2 }}>
              <label>Host</label>
              <input value={form.host} onChange={(e) => update("host", e.target.value)} required />
            </div>
            <div className="field">
              <label>Port</label>
              <input type="number" value={form.port} onChange={(e) => update("port", e.target.value)} required />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Database name</label>
              <input value={form.db_name} onChange={(e) => update("db_name", e.target.value)} required />
            </div>
            <div className="field">
              <label>Username</label>
              <input value={form.db_username} onChange={(e) => update("db_username", e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.db_password} onChange={(e) => update("db_password", e.target.value)} required />
            </div>
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Testing connection…" : "Add connection"}
          </button>
          <p className="small muted" style={{ marginTop: 8 }}>
            The connection is tested immediately after creation — if it can't connect, it won't be saved.
          </p>
        </form>
      </div>

      <div className="panel">
        <h3>Your connections</h3>
        {connections.length === 0 ? (
          <div className="empty">No connections yet — add one above.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Host</th>
                <th>Database</th>
                <th>Test</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {connections.map((c) => {
                const t = testResults[c.db_connection_id];
                return (
                  <tr key={c.db_connection_id}>
                    <td>{c.name}</td>
                    <td>{c.host}:{c.port}</td>
                    <td>{c.db_name}</td>
                    <td>
                      <button className="link-btn" onClick={() => testConnection(c.db_connection_id)}>
                        {t?.loading ? "testing…" : "run test"}
                      </button>
                      {t && !t.loading && (
                        <span className={`badge ${t.ok ? "badge-success" : "badge-failed"}`} style={{ marginLeft: 8 }}>
                          {t.ok ? "ok" : "failed"}
                        </span>
                      )}
                      {t && !t.loading && !t.ok && t.detail && (
                        <div className="small" style={{ color: "var(--error)", marginTop: 4 }}>{t.detail}</div>
                      )}
                    </td>
                    <td>
                      <button className="link-btn" style={{ color: "var(--error)" }} onClick={() => remove(c.db_connection_id)}>
                        delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
