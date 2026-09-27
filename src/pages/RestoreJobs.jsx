import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import StatusBadge from "../StatusBadge.jsx";

export default function RestoreJobs({ refreshKey }) {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  function toggleError(id) {
    setExpandedId((current) => (current === id ? null : id));
  }

  async function load() {
    try {
      setJobs(await api.listRestoreJobs());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  // Poll while any job is still pending/running so status updates without a manual refresh.
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "pending" || j.status === "running");
    if (!hasActive) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [jobs]);

  return (
    <div>
      <h1 className="page-title">Restore jobs</h1>
      <p className="page-sub">History of pg_restore runs kicked off from a backup.</p>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        <div className="btn-row" style={{ marginBottom: 14 }}>
          <button className="btn-ghost btn" onClick={load}>Refresh</button>
        </div>
        {jobs.length === 0 ? (
          <div className="empty">No restore jobs yet — start one from the Backups tab.</div>
        ) : (
                    <table>
            <thead>
              <tr>
                <th>Target</th>
                <th>Status</th>
                <th>Started</th>
                <th>Completed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs
                .slice()
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((j) => (
                  <React.Fragment key={j.restore_job_id}>
                    <tr>
                      <td>{j.target_db_name || j.target_connection_id || "—"}</td>
                      <td><StatusBadge status={j.status} /></td>
                      <td>{j.started_at ? new Date(j.started_at).toLocaleString() : "—"}</td>
                      <td>{j.completed_at ? new Date(j.completed_at).toLocaleString() : "—"}</td>
                      <td>
                        {j.status === "failed" && j.error_message && (
                          <button className="link-btn" onClick={() => toggleError(j.restore_job_id)}>
                            {expandedId === j.restore_job_id ? "hide error" : "view error"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === j.restore_job_id && (
                      <tr>
                        <td colSpan={5}>
                          <div
                            className="error-banner"
                            style={{ margin: "6px 0", maxHeight: 260, overflowY: "auto", whiteSpace: "pre-wrap", fontFamily: "var(--mono)", fontSize: 12 }}
                          >
                            {j.error_message}
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
