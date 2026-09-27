import React, { useEffect, useState } from "react";
import { api, setToken } from "./api.js";
import Auth from "./pages/Auth.jsx";
import Connections from "./pages/Connections.jsx";
import StorageBackends from "./pages/StorageBackends.jsx";
import Schedules from "./pages/Schedules.jsx";
import Backups from "./pages/Backups.jsx";
import RestoreJobs from "./pages/RestoreJobs.jsx";

const TABS = [
  { key: "connections", label: "Connections" },
  { key: "storage", label: "Storage backends" },
  { key: "schedules", label: "Schedules" },
  { key: "backups", label: "Backups" },
  { key: "restores", label: "Restore jobs" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState("connections");
  const [restoreRefreshKey, setRestoreRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  function handleAuthed() {
    api.me().then(setUser).catch(() => setUser(null));
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  if (checking) return null;
  if (!user) return <Auth onAuthed={handleAuthed} />;

  return (
    <div className="shell">
      <div className="sidebar">
        <div className="brand">
          <div className="brand-title">PG Backup &amp; Recovery</div>
          <div className="brand-sub">{user.email}</div>
        </div>
        <nav>
          {TABS.map((t) => (
            <div
              key={t.key}
              className={`nav-item ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </nav>
        <div className="nav-footer">
          <button className="btn btn-ghost" style={{ width: "100%" }} onClick={logout}>
            Sign out
          </button>
        </div>
      </div>

      <div className="main">
        {tab === "connections" && <Connections />}
        {tab === "storage" && <StorageBackends />}
        {tab === "schedules" && <Schedules />}
        {tab === "backups" && (
          <Backups onRestoreStarted={() => setRestoreRefreshKey((k) => k + 1)} />
        )}
        {tab === "restores" && <RestoreJobs refreshKey={restoreRefreshKey} />}
      </div>
    </div>
  );
}
