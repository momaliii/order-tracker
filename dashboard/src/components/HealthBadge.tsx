import { useEffect, useState } from 'react';
import './HealthBadge.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type HealthState =
  | { status: 'loading' }
  | { status: 'ok' }
  | { status: 'error'; message?: string };

export default function HealthBadge() {
  const [state, setState] = useState<HealthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        if (json?.status === 'ok') setState({ status: 'ok' });
        else setState({ status: 'error', message: 'Unhealthy' });
      } catch (e) {
        if (cancelled) return;
        setState({
          status: 'error',
          message: e instanceof Error ? e.message : 'Failed',
        });
      }
    }

    run();
    const t = setInterval(run, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const label =
    state.status === 'loading'
      ? 'Checking…'
      : state.status === 'ok'
        ? 'API OK'
        : 'API Error';

  return (
    <div className="healthBadge" title={state.status === 'error' ? state.message : undefined}>
      <span className={`healthDot healthDot--${state.status}`} />
      <span className="healthLabel">{label}</span>
    </div>
  );
}

