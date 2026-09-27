// Thin fetch wrapper around the PostgreSQL Backup & Recovery FastAPI backend.
// In dev, Vite proxies /api, /login, /signup, /me to http://localhost:8000 (see vite.config.js).
// In prod, set VITE_API_BASE_URL to your deployed backend's origin.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function getToken() {
  return localStorage.getItem("access_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("access_token", token);
  else localStorage.removeItem("access_token");
}

async function request(path, { method = "GET", body, form, auth = true } = {}) {
  const headers = {};
  let payload = body;

  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = new URLSearchParams(body).toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail =
      (data && (data.detail || (Array.isArray(data.detail) ? data.detail[0]?.msg : null))) ||
      res.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export const api = {
  // --- auth ---
  signup: (email, password) => request("/signup", { method: "POST", body: { email, password }, auth: false }),
  login: (email, password) =>
    request("/login", { method: "POST", form: true, body: { username: email, password }, auth: false }),
  me: () => request("/me"),

  // --- database connections ---
  listConnections: () => request("/api/connections"),
  createConnection: (payload) => request("/api/connections", { method: "POST", body: payload }),
  updateConnection: (id, payload) => request(`/api/connections/${id}`, { method: "PUT", body: payload }),
  deleteConnection: (id) => request(`/api/connections/${id}`, { method: "DELETE" }),
  testConnection: (id) => request(`/api/connections/${id}/test`, { method: "POST" }),

  // --- storage backends ---
  listStorageBackends: () => request("/api/storage-backends"),
  createStorageBackend: (payload) => request("/api/storage-backends", { method: "POST", body: payload }),
  deleteStorageBackend: (id) => request(`/api/storage-backends/${id}`, { method: "DELETE" }),
  testStorageBackend: (id) => request(`/api/storage-backends/${id}/test`, { method: "POST" }),

  // --- schedules ---
  listSchedules: (connectionId) => request(`/api/connections/${connectionId}/schedules`),
  createSchedule: (connectionId, payload) =>
    request(`/api/connections/${connectionId}/schedules`, { method: "POST", body: payload }),
  updateSchedule: (id, payload) => request(`/api/schedules/${id}`, { method: "PUT", body: payload }),
  deleteSchedule: (id) => request(`/api/schedules/${id}`, { method: "DELETE" }),

  // --- backups ---
  listAllBackups: () => request("/api/backups"),
  listConnectionBackups: (connectionId) => request(`/api/connections/${connectionId}/backups`),
  createBackup: (connectionId, payload = {}) =>
    request(`/api/connections/${connectionId}/backups`, { method: "POST", body: payload }),
  getBackup: (id) => request(`/api/backups/${id}`),
  deleteBackup: (id) => request(`/api/backups/${id}`, { method: "DELETE" }),
  downloadBackupUrl: (id) => `${BASE_URL}/api/backups/${id}/download`,

  // --- restore jobs ---
  listRestoreJobs: () => request("/api/restore-jobs"),
  getRestoreJob: (id) => request(`/api/restore-jobs/${id}`),
  createRestoreJob: (backupId, payload = {}) =>
    request(`/api/backups/${backupId}/restore-jobs`, { method: "POST", body: payload }),
};
