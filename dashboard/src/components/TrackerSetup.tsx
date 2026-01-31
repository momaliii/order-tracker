import { useEffect, useMemo, useState } from 'react';
import './TrackerSetup.css';
import { useAuth } from '../lib/auth';

function copy(text: string) {
  return navigator.clipboard.writeText(text);
}

function normalizeBase(url: string) {
  return url.replace(/\/+$/, '');
}

type TestState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'ok'; details: { health: string; tracker: string } }
  | { status: 'error'; message: string };

export default function TrackerSetup() {
  const { accessToken } = useAuth();
  const [apiBase, setApiBase] = useState<string>(
    (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000'
  );
  const [loadInHead, setLoadInHead] = useState(true);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const [eoSecret, setEoSecret] = useState('');
  const [eoStatus, setEoStatus] = useState<{ configured: boolean; source: string } | null>(null);
  const [eoMsg, setEoMsg] = useState<string | null>(null);

  const api = useMemo(() => normalizeBase(apiBase.trim()), [apiBase]);
  const trackerUrl = `${api}/tracker.js`;

  const snippet = useMemo(() => {
    const lines = [
      '<script>',
      '  (function () {',
      "    var s = document.createElement('script');",
      `    s.src = '${trackerUrl}';`,
      '    s.async = true;',
      `    s.setAttribute('data-api-url', '${api}');`,
      '    document.head.appendChild(s);',
      '  })();',
      '</script>',
    ];
    return lines.join('\n');
  }, [api, trackerUrl]);

  const gtmSnippet = useMemo(() => {
    // Custom HTML tag in GTM
    const lines = [
      '<script>',
      '  (function () {',
      "    var s = document.createElement('script');",
      `    s.src = '${trackerUrl}';`,
      '    s.async = true;',
      `    s.setAttribute('data-api-url', '${api}');`,
      '    document.head.appendChild(s);',
      '  })();',
      '</script>',
    ];
    return lines.join('\n');
  }, [api, trackerUrl]);

  const runTest = async () => {
    setTestState({ status: 'running' });
    try {
      const healthRes = await fetch(`${api}/health`, { cache: 'no-store' });
      const trackerRes = await fetch(trackerUrl, { cache: 'no-store' });

      if (!healthRes.ok) {
        throw new Error(`Health check failed: HTTP ${healthRes.status}`);
      }
      const healthJson = await healthRes.json().catch(() => null);
      if (healthJson?.status !== 'ok') {
        throw new Error(`Health check returned non-ok status`);
      }

      if (!trackerRes.ok) {
        throw new Error(`Tracker fetch failed: HTTP ${trackerRes.status}`);
      }
      const trackerText = await trackerRes.text();
      if (!trackerText.includes('AttributionTracker')) {
        throw new Error('Tracker script loaded, but signature not found');
      }

      setTestState({
        status: 'ok',
        details: {
          health: 'OK (API + DB reachable)',
          tracker: 'OK (tracker.js served)',
        },
      });
    } catch (e) {
      setTestState({
        status: 'error',
        message: e instanceof Error ? e.message : 'Test failed',
      });
    }
  };

  useEffect(() => {
    // No-op: legacy admin-key flow removed in Supabase Auth mode.
  }, []);

  const fetchEasyOrdersStatus = async () => {
    try {
      const res = await fetch(`${api}/api/settings/status`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        cache: 'no-store',
      });
      const json = await res.json();
      if (json?.success) {
        setEoStatus(json.easyorders);
      } else {
        setEoStatus(null);
        setEoMsg(json?.error || 'Unauthorized');
      }
    } catch {
      setEoStatus(null);
    }
  };

  const saveEasyOrdersSecret = async () => {
    setEoMsg(null);
    if (!accessToken) {
      setEoMsg('You must be signed in.');
      return;
    }
    if (!eoSecret.trim()) {
      setEoMsg('Webhook secret is required.');
      return;
    }

    try {
      const res = await fetch(`${api}/api/settings/easyorders-webhook-secret`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ secret: eoSecret.trim() }),
      });
      const json = await res.json();
      if (!json?.success) {
        setEoMsg(json?.error || 'Failed to save secret');
        return;
      }
      setEoSecret('');
      setEoMsg('Saved. Webhook verification is now enabled (dashboard mode).');
      await fetchEasyOrdersStatus();
    } catch (e) {
      setEoMsg(e instanceof Error ? e.message : 'Failed to save secret');
    }
  };

  return (
    <div className="setup">
      <div className="setupGrid">
        <div className="setupCard">
          <h2>Install Tracker</h2>
          <p className="muted">
            Copy the snippet and paste it on your store (all pages). This is the only code you need
            on the website.
          </p>

          <div className="field">
            <label>API Base URL</label>
            <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
            <div className="hint">Example: https://your-api.com or http://localhost:3000</div>
          </div>

          <div className="fieldRow">
            <label className="check">
              <input
                type="checkbox"
                checked={loadInHead}
                onChange={(e) => setLoadInHead(e.target.checked)}
              />
              Load in &lt;head&gt; (recommended)
            </label>
            <div className="btnRow">
              <button className="btn" onClick={runTest} type="button" disabled={!api || testState.status === 'running'}>
                {testState.status === 'running' ? 'Testing…' : 'Test Setup'}
              </button>
              <button
                className="btn btnPrimary"
                onClick={() => copy(snippet)}
                type="button"
                title="Copy to clipboard"
              >
                Copy Snippet
              </button>
            </div>
          </div>

          {testState.status === 'ok' && (
            <div className="testBox testBoxOk">
              <div className="testTitle">Setup test passed</div>
              <div className="testLine">- {testState.details.health}</div>
              <div className="testLine">- {testState.details.tracker}</div>
            </div>
          )}
          {testState.status === 'error' && (
            <div className="testBox testBoxErr">
              <div className="testTitle">Setup test failed</div>
              <div className="testLine">{testState.message}</div>
            </div>
          )}

          <pre className="code">{snippet}</pre>
        </div>

        <div className="setupCard">
          <h2>GTM (optional)</h2>
          <p className="muted">
            If you use Google Tag Manager: create a <b>Custom HTML</b> tag and paste the snippet.
            Trigger: <b>All Pages</b>.
          </p>

          <div className="fieldRow">
            <div />
            <button className="btn" onClick={() => copy(gtmSnippet)} type="button">
              Copy GTM Snippet
            </button>
          </div>
          <pre className="code">{gtmSnippet}</pre>
        </div>
      </div>

      <div className="setupCard">
        <h2>EasyOrders Webhook Secret</h2>
        <p className="muted">
          You can set the webhook secret from the dashboard (stored as a hash in the database).
          Only signed-in admins can change this setting.
        </p>

        <div className="twoCol">
          <div className="field">
            <label>EasyOrders Webhook Secret</label>
            <input
              value={eoSecret}
              onChange={(e) => setEoSecret(e.target.value)}
              placeholder="Paste secret from EasyOrders webhook settings"
            />
          </div>
        </div>

        <div className="fieldRow">
          <button className="btn" type="button" onClick={fetchEasyOrdersStatus} disabled={!accessToken}>
            Refresh Status
          </button>
          <button className="btn btnPrimary" type="button" onClick={saveEasyOrdersSecret} disabled={!accessToken}>
            Save Secret
          </button>
        </div>

        {eoStatus && (
          <div className="testBox">
            <div className="testTitle">Current status</div>
            <div className="testLine">
              - Configured: <b>{eoStatus.configured ? 'Yes' : 'No'}</b>
            </div>
            <div className="testLine">
              - Source: <b>{eoStatus.source}</b>
            </div>
          </div>
        )}

        {eoMsg && (
          <div className={`testBox ${eoMsg.startsWith('Saved') ? 'testBoxOk' : 'testBoxErr'}`}>
            <div className="testTitle">Message</div>
            <div className="testLine">{eoMsg}</div>
          </div>
        )}
      </div>

      <div className="setupCard">
        <h2>Verify</h2>
        <ul className="list">
          <li>
            Open <code>{trackerUrl}</code> in your browser. You should see JavaScript.
          </li>
          <li>
            Visit your store with a UTM link and check Network tab for <code>/api/collect</code>.
          </li>
          <li>
            Create a test order (EasyOrders webhook) and confirm it appears in Orders.
          </li>
        </ul>
      </div>
    </div>
  );
}

