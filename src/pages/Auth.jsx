import React, { useState } from "react";
import { api, setToken } from "../api.js";

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await api.signup(email, password);
      }
      const { access_token } = await api.login(email, password);
      setToken(access_token);
      onAuthed();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="panel auth-card">
        <div className="auth-title">{mode === "login" ? "Sign in" : "Create account"}</div>
        <div className="auth-sub">PostgreSQL Backup &amp; Recovery</div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === "login" ? (
            <>No account? <a onClick={() => setMode("signup")}>Create one</a></>
          ) : (
            <>Already have an account? <a onClick={() => setMode("login")}>Sign in</a></>
          )}
        </div>
      </div>
    </div>
  );
}
