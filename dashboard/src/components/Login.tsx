import { useState } from 'react';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

export default function Login(props: { onLogin: (username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.error || 'Login failed');
        return;
      }
      props.onLogin(json.username || username.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginWrap">
      <div className="loginCard">
        <h1>Attribution Tracker</h1>
        <p className="loginMuted">Admin login required to view the dashboard.</p>

        <div className="loginField">
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
        </div>

        <div className="loginField">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <div className="loginError">{error}</div>}

        <button className="loginBtn" onClick={submit} disabled={loading || !username.trim() || !password}>
          {loading ? 'Logging in…' : 'Login'}
        </button>

        <div className="loginHint">
          Set <code>ADMIN_USERNAME</code> and <code>ADMIN_PASSWORD_HASH</code> in your server <code>.env</code>.
        </div>
      </div>
    </div>
  );
}

