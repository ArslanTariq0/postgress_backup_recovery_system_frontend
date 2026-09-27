import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY_FORM = {
  name: "",
  type: "local",
  s3_bucket: "",
  s3_region: "",
  s3_prefix: "",
  s3_endpoint_url: "",
  s3_access_key: "",
  s3_secret_key: "",
  is_default: false,
};

export default function StorageBackends() {
  const [backends, setBackends] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setBackends(await api.listStorageBackends());
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

  async function create(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = { ...form };
      if (payload.type === "local") {
        // Don't send empty S3 fields for a local backend.
        delete payload.s3_bucket;
        delete payload.s3_region;
        delete payload.s3_prefix;
        delete payload.s3_endpoint_url;
        delete payload.s3_access_key;
        delete payload.s3_secret_key;
      }
      await api.createStorageBackend(payload);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this storage backend?")) return;
    try {
      await api.deleteStorageBackend(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">Storage backends</h1>
      <p className="page-sub">Where backup files get written — local disk or S3-compatible storage.</p>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        <h3>Add a storage backend</h3>
        <form onSubmit={create}>
          <div className="row">
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => update("type", e.target.value)}>
                <option value="local">local</option>
                <option value="s3">s3</option>
              </select>
            </div>
          </div>

          {form.type === "s3" && (
            <>
              <div className="row">
                <div className="field">
                  <label>Bucket</label>
                  <input value={form.s3_bucket} onChange={(e) => update("s3_bucket", e.target.value)} required />
                </div>
                <div className="field">
                  <label>Region</label>
                  <input value={form.s3_region} onChange={(e) => update("s3_region", e.target.value)} />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Prefix (optional)</label>
                  <input value={form.s3_prefix} onChange={(e) => update("s3_prefix", e.target.value)} />
                </div>
                <div className="field">
                  <label>Custom endpoint URL (optional — R2, MinIO, etc.)</label>
                  <input value={form.s3_endpoint_url} onChange={(e) => update("s3_endpoint_url", e.target.value)} />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Access key</label>
                  <input value={form.s3_access_key} onChange={(e) => update("s3_access_key", e.target.value)} required />
                </div>
                <div className="field">
                  <label>Secret key</label>
                  <input type="password" value={form.s3_secret_key} onChange={(e) => update("s3_secret_key", e.target.value)} required />
                </div>
              </div>
            </>
          )}

          <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={form.is_default}
              onChange={(e) => update("is_default", e.target.checked)}
              id="is_default"
            />
            <label htmlFor="is_default" style={{ margin: 0 }}>Use as default for new backups</label>
          </div>

          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add storage backend"}
          </button>
        </form>
      </div>

      <div className="panel">
        <h3>Your storage backends</h3>
        {backends.length === 0 ? (
          <div className="empty">None yet — backups default to local disk on the server.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Bucket / path</th>
                <th>Default</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {backends.map((b) => (
                <tr key={b.storage_backend_id}>
                  <td>{b.name}</td>
                  <td>{b.type}</td>
                  <td>{b.s3_bucket || "—"}</td>
                  <td>{b.is_default ? "yes" : "no"}</td>
                  <td>
                    <button className="link-btn" style={{ color: "var(--error)" }} onClick={() => remove(b.storage_backend_id)}>
                      delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
