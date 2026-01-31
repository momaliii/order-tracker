import { useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await requireSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginWrap">
      <div className="loginCard">
        <h1>Attribution Tracker</h1>
        <p className="loginSub">Sign in to manage tracking + webhooks.</p>

        <div className="loginField">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" />
        </div>

        <div className="loginField">
          <label>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
          />
        </div>

        {error && <div className="loginErr">{error}</div>}

        <button className="loginBtn" onClick={signIn} disabled={loading || !email.trim() || !password}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="loginHint">
          Create users in Supabase → Authentication → Users. (For production you can add email invites / magic links.)
        </div>
      </div>
    </div>
  );
}

