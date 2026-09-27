import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Schedules() {
  const [connections, setConnections] = useState([]);
  const [backends, setBackends] = useState([]);
  const [connectionId, setConnectionId] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [cron, setCron] = useState("0 2 * * *");
  const [retentionDays, setRetentionDays] = useState(30);
  const [storageBackendId, setStorageBackendId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [conns, backs] = await Promise.all([api.listConnections(), api.listStorageBackends()]);
        setConnections(conns);
        setBackends(backs);
        if (conns.length) setConnectionId(conns[0].db_connection_id);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  async function loadSchedules(id) {
    if (!id) return;
    try {
      setSchedules(await api.listSchedules(id));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadSchedules(connectionId);
  }, [connectionId]);

  async function create(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.createSchedule(connectionId, {
        cron_expression: cron,
        retention_days: Number(retentionDays),
        storage_backend_id: storageBackendId || null,
      });
      await loadSchedules(connectionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(schedule) {
    try {
      await api.updateSchedule(schedule.schedule_id, { is_active: !schedule.is_active });
      await loadSchedules(connectionId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this schedule?")) return;
    try {
      await api.deleteSchedule(id);
      await loadSchedules(connectionId);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">Backup schedules</h1>
      <p className="page-sub">Recurring backups on a cron expression, per connection.</p>

      {error && <div className="error-banner">{error}</div>}

      {connections.length === 0 ? (
        <div className="panel"><div className="empty">Add a database connection first.</div></div>
      ) : (
        <>
          <div className="panel">
            <div className="field">
              <label>Connection</label>
              <select value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
                {connections.map((c) => (
                  <option key={c.db_connection_id} value={c.db_connection_id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="panel">
            <h3>New schedule</h3>
            <form onSubmit={create}>
              <div className="row">
                <div className="field">
                  <label>Cron expression</label>
                  <input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 2 * * *" required />
                </div>
                <div className="field">
                  <label>Retention (days)</label>
                  <input type="number" min="1" value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} required />
                </div>
              </div>
              <div className="field">
                <label>Storage backend (optional — defaults to local disk)</label>
                <select value={storageBackendId} onChange={(e) => setStorageBackendId(e.target.value)}>
                  <option value="">local disk</option>
                  {backends.map((b) => (
                    <option key={b.storage_backend_id} value={b.storage_backend_id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <p className="small muted">
                Standard 5-field cron: minute hour day month weekday. e.g. <code>*/2 * * * *</code> = every 2 minutes, <code>0 2 * * *</code> = daily at 2am.
              </p>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create schedule"}
              </button>
            </form>
          </div>

          <div className="panel">
            <h3>Schedules for this connection</h3>
            {schedules.length === 0 ? (
              <div className="empty">No schedules yet.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Cron</th>
                    <th>Retention</th>
                    <th>Next run</th>
                    <th>Last run</th>
                    <th>Active</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.schedule_id}>
                      <td>{s.cron_expression}</td>
                      <td>{s.retention_days}d</td>
                      <td>{s.next_run_at ? new Date(s.next_run_at).toLocaleString() : "—"}</td>
                      <td>{s.last_run_at ? new Date(s.last_run_at).toLocaleString() : "—"}</td>
                      <td>
                        <button className="link-btn" onClick={() => toggleActive(s)}>
                          {s.is_active ? "active" : "paused"}
                        </button>
                      </td>
                      <td>
                        <button className="link-btn" style={{ color: "var(--error)" }} onClick={() => remove(s.schedule_id)}>
                          delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
