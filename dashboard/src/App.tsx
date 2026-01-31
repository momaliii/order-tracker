import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Home from './components/Home';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

function App() {
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const checkMe = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include', cache: 'no-store' });
      const json = await res.json();
      if (json?.success && json?.authenticated) setUsername(json.username || 'admin');
      else setUsername(null);
    } catch {
      setUsername(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    setUsername(null);
  };

  if (checking) {
    return <div className="App" style={{ padding: 20 }}>Loading…</div>;
  }

  if (!username) {
    return (
      <div className="App">
        {showLogin ? (
          <Login
            onLogin={(u) => {
              setUsername(u);
              setShowLogin(false);
            }}
          />
        ) : (
          <Home onLoginClick={() => setShowLogin(true)} />
        )}
      </div>
    );
  }

  return (
    <div className="App">
      <Dashboard />
      <div style={{ position: 'fixed', right: 16, bottom: 16 }}>
        <button
          onClick={logout}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            background: '#fff',
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default App;
