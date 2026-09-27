import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import StatusBadge from "../StatusBadge.jsx";

export default function Backups({ onRestoreStarted }) {
  const [connections, setConnections] = useState([]);
  const [backups, setBackups] = useState([]);
  const [connectionId, setConnectionId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    try {
      setBackups(await api.listAllBackups());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const conns = await api.listConnections();
        setConnections(conns);
        if (conns.length) setConnectionId(conns[0].db_connection_id);
      } catch (err) {
        setError(err.message);
      }
      await loadAll();
    })();
  }, []);

  async function runBackup(e) {
    e.preventDefault();
    if (!connectionId) return;
    setError("");
    setBusy(true);
    try {
      await api.createBackup(connectionId, {});
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this backup file and its record?")) return;
    try {
      await api.deleteBackup(id);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const [restoringBackupId, setRestoringBackupId] = useState(null); // which row has its restore panel open
  const [restoreMode, setRestoreMode] = useState("original"); // "original" | "connection" | "custom"
  const [restoreTargetConnectionId, setRestoreTargetConnectionId] = useState("");
  const [restoreCustom, setRestoreCustom] = useState({
    host: "", port: 5432, db_name: "", db_username: "", db_password: "", ssl_mode: "prefer",
  });
  const [restoreBusy, setRestoreBusy] = useState(false);

  function openRestorePanel(backupId) {
    setRestoringBackupId(backupId);
    setRestoreMode("original");
    setRestoreTargetConnectionId(connections[0]?.db_connection_id || "");
  }

  function closeRestorePanel() {
    setRestoringBackupId(null);
  }

  async function submitRestore(backupId) {
    const label =
      restoreMode === "original"
        ? "its original connection"
        : restoreMode === "connection"
        ? `"${connectionName(restoreTargetConnectionId)}"`
        : `${restoreCustom.host}/${restoreCustom.db_name}`;
    if (!confirm(`Restore this backup into ${label}? This overwrites current data there.`)) return;

    setRestoreBusy(true);
    setError("");
    try {
      let payload = {};
      if (restoreMode === "connection") {
        payload = { target_connection_id: restoreTargetConnectionId };
      } else if (restoreMode === "custom") {
        payload = { target: { ...restoreCustom, port: Number(restoreCustom.port) } };
      }
      const job = await api.createRestoreJob(backupId, payload);
      onRestoreStarted?.(job);
      closeRestorePanel();
      alert(`Restore job started (status: ${job.status}). Check the Restore jobs tab for progress.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setRestoreBusy(false);
    }
  }

  function connectionName(id) {
    return connections.find((c) => c.db_connection_id === id)?.name || id;
  }

  return (
    <div>
      <h1 className="page-title">Backups</h1>
      <p className="page-sub">Manual and scheduled backup runs across all connections.</p>

      {error && <div className="error-banner">{error}</div>}

      {connections.length === 0 ? (
        <div className="panel"><div className="empty">Add a database connection first.</div></div>
      ) : (
        <div className="panel">
          <h3>Run a manual backup</h3>
          <form onSubmit={runBackup} className="row" style={{ alignItems: "flex-end" }}>
            <div className="field">
              <label>Connection</label>
              <select value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
                {connections.map((c) => (
                  <option key={c.db_connection_id} value={c.db_connection_id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: "0 0 auto" }}>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Starting…" : "Run backup now"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <h3>All backups</h3>
        {backups.length === 0 ? (
          <div className="empty">No backups yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Connection</th>
                <th>Status</th>
                <th>Size</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {backups
                .slice()
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((b) => (
                  <React.Fragment key={b.backup_id}>
                    <tr>
                      <td>{connectionName(b.connection_id)}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>{b.size_bytes ? `${(b.size_bytes / 1024 / 1024).toFixed(2)} MB` : "—"}</td>
                      <td>{new Date(b.created_at).toLocaleString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: 10 }}>
                          {b.status === "success" && (
                            <>
                              <a className="link-btn" href={api.downloadBackupUrl(b.backup_id)} target="_blank" rel="noreferrer">
                                download
                              </a>
                              <button className="link-btn" onClick={() => openRestorePanel(b.backup_id)}>restore</button>
                            </>
                          )}
                          <button className="link-btn" style={{ color: "var(--error)" }} onClick={() => remove(b.backup_id)}>
                            delete
                          </button>
                        </div>
                        {b.status === "failed" && b.error_message && (
                          <div className="small" style={{ color: "var(--error)", marginTop: 4 }}>{b.error_message}</div>
                        )}
                      </td>
                    </tr>

                    {restoringBackupId === b.backup_id && (
                      <tr>
                        <td colSpan={5}>
                          <div className="panel" style={{ margin: "6px 0" }}>
                            <h3>Restore this backup</h3>

                            <div className="field">
                              <label>Restore into</label>
                              <select value={restoreMode} onChange={(e) => setRestoreMode(e.target.value)}>
                                <option value="original">Original connection ({connectionName(b.connection_id)})</option>
                                <option value="connection">A different registered connection</option>
                                <option value="custom">A one-off database (not registered)</option>
                              </select>
                            </div>

                            {restoreMode === "connection" && (
                              <div className="field">
                                <label>Target connection</label>
                                <select value={restoreTargetConnectionId} onChange={(e) => setRestoreTargetConnectionId(e.target.value)}>
                                  {connections.map((c) => (
                                    <option key={c.db_connection_id} value={c.db_connection_id}>{c.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {restoreMode === "custom" && (
                              <>
                                <div className="row">
                                  <div className="field" style={{ flex: 2 }}>
                                    <label>Host</label>
                                    <input
                                      value={restoreCustom.host}
                                      onChange={(e) => setRestoreCustom((f) => ({ ...f, host: e.target.value }))}
                                    />
                                  </div>
                                  <div className="field">
                                    <label>Port</label>
                                    <input
                                      type="number"
                                      value={restoreCustom.port}
                                      onChange={(e) => setRestoreCustom((f) => ({ ...f, port: e.target.value }))}
                                    />
                                  </div>
                                </div>
                                <div className="row">
                                  <div className="field">
                                    <label>Database name</label>
                                    <input
                                      value={restoreCustom.db_name}
                                      onChange={(e) => setRestoreCustom((f) => ({ ...f, db_name: e.target.value }))}
                                    />
                                  </div>
                                  <div className="field">
                                    <label>Username</label>
                                    <input
                                      value={restoreCustom.db_username}
                                      onChange={(e) => setRestoreCustom((f) => ({ ...f, db_username: e.target.value }))}
                                    />
                                  </div>
                                  <div className="field">
                                    <label>Password</label>
                                    <input
                                      type="password"
                                      value={restoreCustom.db_password}
                                      onChange={(e) => setRestoreCustom((f) => ({ ...f, db_password: e.target.value }))}
                                    />
                                  </div>
                                </div>
                              </>
                            )}

                            <div className="btn-row">
                              <button className="btn" disabled={restoreBusy} onClick={() => submitRestore(b.backup_id)}>
                                {restoreBusy ? "Starting…" : "Start restore"}
                              </button>
                              <button className="btn btn-ghost" onClick={closeRestorePanel}>Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
