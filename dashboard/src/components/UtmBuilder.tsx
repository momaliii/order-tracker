import { useEffect, useMemo, useState } from 'react';
import './UtmBuilder.css';

type Preset = {
  id: string;
  name: string;
  baseUrl: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
  extra?: Record<string, string>;
};

const STORAGE_KEY = 'att_utm_presets_v1';

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function savePresets(presets: Preset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function copy(text: string) {
  return navigator.clipboard.writeText(text);
}

function normalizeBaseUrl(input: string) {
  const s = input.trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function buildUrlFromPreset(p: Preset) {
  const base = normalizeBaseUrl(p.baseUrl);
  const u = new URL(base);
  if (p.utm_source) u.searchParams.set('utm_source', p.utm_source);
  if (p.utm_medium) u.searchParams.set('utm_medium', p.utm_medium);
  if (p.utm_campaign) u.searchParams.set('utm_campaign', p.utm_campaign);
  if (p.utm_content) u.searchParams.set('utm_content', p.utm_content);
  if (p.utm_term) u.searchParams.set('utm_term', p.utm_term);
  for (const [k, v] of Object.entries(p.extra || {})) {
    if (!k.trim() || !v.trim()) continue;
    u.searchParams.set(k.trim(), v.trim());
  }
  return u.toString();
}

function buildCampaignName(parts: {
  platform: string;
  country: string;
  objective: string;
  offer: string;
  audience: string;
  placement: string;
}) {
  const tokens = [
    parts.platform,
    parts.country,
    parts.objective,
    parts.offer,
    parts.audience,
    parts.placement,
  ].filter(Boolean);
  return tokens.join('_').replace(/\s+/g, '_');
}

export default function UtmBuilder() {
  const [baseUrl, setBaseUrl] = useState('https://yourstore.com/');
  const [utm_source, setUtmSource] = useState('facebook');
  const [utm_medium, setUtmMedium] = useState('cpc');
  const [utm_campaign, setUtmCampaign] = useState('');
  const [utm_content, setUtmContent] = useState('');
  const [utm_term, setUtmTerm] = useState('');

  const [extra, setExtra] = useState<Array<{ key: string; value: string }>>([
    { key: 'adset', value: '' },
    { key: 'ad', value: '' },
  ]);

  const [presets, setPresets] = useState<Preset[]>(() => loadPresets());
  const [presetName, setPresetName] = useState('');

  // Campaign name helper
  const [campaignParts, setCampaignParts] = useState({
    platform: 'meta',
    country: 'EG',
    objective: 'conv',
    offer: 'offer1',
    audience: 'broad',
    placement: 'feed',
  });

  const builtCampaignName = useMemo(() => buildCampaignName(campaignParts), [campaignParts]);

  const url = useMemo(() => {
    const base = normalizeBaseUrl(baseUrl);
    if (!base) return '';
    const u = new URL(base);
    if (utm_source) u.searchParams.set('utm_source', utm_source);
    if (utm_medium) u.searchParams.set('utm_medium', utm_medium);
    if (utm_campaign) u.searchParams.set('utm_campaign', utm_campaign);
    if (utm_content) u.searchParams.set('utm_content', utm_content);
    if (utm_term) u.searchParams.set('utm_term', utm_term);
    for (const { key, value } of extra) {
      if (!key.trim() || !value.trim()) continue;
      u.searchParams.set(key.trim(), value.trim());
    }
    return u.toString();
  }, [baseUrl, utm_source, utm_medium, utm_campaign, utm_content, utm_term, extra]);

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  const applyTemplate = (platform: 'meta' | 'tiktok' | 'google' | 'snap') => {
    if (platform === 'meta') {
      setUtmSource('facebook');
      setUtmMedium('cpc');
    } else if (platform === 'tiktok') {
      setUtmSource('tiktok');
      setUtmMedium('cpc');
    } else if (platform === 'google') {
      setUtmSource('google');
      setUtmMedium('cpc');
    } else if (platform === 'snap') {
      setUtmSource('snapchat');
      setUtmMedium('cpc');
    }
    setCampaignParts((p) => ({ ...p, platform }));
  };

  const addExtra = () => setExtra((e) => [...e, { key: '', value: '' }]);
  const removeExtra = (idx: number) => setExtra((e) => e.filter((_, i) => i !== idx));

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const rec: Preset = {
      id: uid(),
      name,
      baseUrl: normalizeBaseUrl(baseUrl),
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content: utm_content || undefined,
      utm_term: utm_term || undefined,
      extra: Object.fromEntries(
        extra
          .filter((x) => x.key.trim() && x.value.trim())
          .map((x) => [x.key.trim(), x.value.trim()])
      ),
    };
    setPresets((p) => [rec, ...p]);
    setPresetName('');
  };

  const loadPreset = (p: Preset) => {
    setBaseUrl(p.baseUrl);
    setUtmSource(p.utm_source);
    setUtmMedium(p.utm_medium);
    setUtmCampaign(p.utm_campaign);
    setUtmContent(p.utm_content || '');
    setUtmTerm(p.utm_term || '');
    const list = Object.entries(p.extra || {}).map(([key, value]) => ({ key, value }));
    setExtra(list.length ? list : [{ key: 'adset', value: '' }, { key: 'ad', value: '' }]);
  };

  const deletePreset = (id: string) => setPresets((p) => p.filter((x) => x.id !== id));

  return (
    <div className="utm">
      <div className="utmGrid">
        <div className="utmCard">
          <h2>UTM Builder</h2>
          <p className="muted">
            Build clean UTM links for platform → campaign → creative attribution. Save templates
            and reuse them for clients.
          </p>

          <div className="templateRow">
            <span className="pill">Templates</span>
            <button className="btn" onClick={() => applyTemplate('meta')} type="button">
              Meta
            </button>
            <button className="btn" onClick={() => applyTemplate('tiktok')} type="button">
              TikTok
            </button>
            <button className="btn" onClick={() => applyTemplate('google')} type="button">
              Google
            </button>
            <button className="btn" onClick={() => applyTemplate('snap')} type="button">
              Snapchat
            </button>
          </div>

          <div className="field">
            <label>Landing Page URL</label>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </div>

          <div className="twoCol">
            <div className="field">
              <label>utm_source</label>
              <input value={utm_source} onChange={(e) => setUtmSource(e.target.value)} />
            </div>
            <div className="field">
              <label>utm_medium</label>
              <input value={utm_medium} onChange={(e) => setUtmMedium(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>utm_campaign</label>
            <div className="campaignRow">
              <input value={utm_campaign} onChange={(e) => setUtmCampaign(e.target.value)} />
              <button className="btn" type="button" onClick={() => setUtmCampaign(builtCampaignName)}>
                Use Builder
              </button>
            </div>
            <div className="hint">
              Tip: use a consistent convention. Example: platform_country_objective_offer_audience_placement
            </div>
          </div>

          <div className="twoCol">
            <div className="field">
              <label>utm_content (creative)</label>
              <input value={utm_content} onChange={(e) => setUtmContent(e.target.value)} />
            </div>
            <div className="field">
              <label>utm_term (keyword / audience)</label>
              <input value={utm_term} onChange={(e) => setUtmTerm(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Extra Params (optional)</label>
            <div className="extraList">
              {extra.map((row, idx) => (
                <div className="extraRow" key={idx}>
                  <input
                    placeholder="key"
                    value={row.key}
                    onChange={(e) =>
                      setExtra((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, key: e.target.value } : p))
                      )
                    }
                  />
                  <input
                    placeholder="value"
                    value={row.value}
                    onChange={(e) =>
                      setExtra((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, value: e.target.value } : p))
                      )
                    }
                  />
                  <button className="btnDanger" type="button" onClick={() => removeExtra(idx)}>
                    Remove
                  </button>
                </div>
              ))}
              <button className="btn" type="button" onClick={addExtra}>
                + Add param
              </button>
            </div>
          </div>

          <div className="fieldRow">
            <button className="btnPrimary" type="button" onClick={() => copy(url)} disabled={!url}>
              Copy URL
            </button>
            <div className="saveRow">
              <input
                className="presetInput"
                placeholder="Preset name (e.g. ClientA_Meta_Conv)"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <button className="btn" type="button" onClick={savePreset} disabled={!presetName.trim()}>
                Save preset
              </button>
            </div>
          </div>

          <pre className="code">{url || 'Enter a landing page URL to generate a link…'}</pre>
        </div>

        <div className="utmCard">
          <h2>Campaign Name Builder</h2>
          <p className="muted">Build consistent campaign names for reporting and scaling.</p>

          <div className="twoCol">
            <div className="field">
              <label>Platform</label>
              <input
                value={campaignParts.platform}
                onChange={(e) => setCampaignParts((p) => ({ ...p, platform: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Country</label>
              <input
                value={campaignParts.country}
                onChange={(e) => setCampaignParts((p) => ({ ...p, country: e.target.value }))}
              />
            </div>
          </div>

          <div className="twoCol">
            <div className="field">
              <label>Objective</label>
              <input
                value={campaignParts.objective}
                onChange={(e) => setCampaignParts((p) => ({ ...p, objective: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Offer</label>
              <input
                value={campaignParts.offer}
                onChange={(e) => setCampaignParts((p) => ({ ...p, offer: e.target.value }))}
              />
            </div>
          </div>

          <div className="twoCol">
            <div className="field">
              <label>Audience</label>
              <input
                value={campaignParts.audience}
                onChange={(e) => setCampaignParts((p) => ({ ...p, audience: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Placement</label>
              <input
                value={campaignParts.placement}
                onChange={(e) => setCampaignParts((p) => ({ ...p, placement: e.target.value }))}
              />
            </div>
          </div>

          <div className="fieldRow">
            <button className="btnPrimary" type="button" onClick={() => copy(builtCampaignName)}>
              Copy Name
            </button>
            <span className="pill">Example</span>
          </div>
          <pre className="code">{builtCampaignName}</pre>
        </div>
      </div>

      <div className="utmCard">
        <h2>Saved Presets</h2>
        {presets.length === 0 ? (
          <p className="muted">No presets yet. Save one from the builder.</p>
        ) : (
          <div className="presetList">
            {presets.map((p) => (
              <div className="presetItem" key={p.id}>
                <div className="presetMeta">
                  <div className="presetName">{p.name}</div>
                  <div className="presetSmall">
                    {p.utm_source}/{p.utm_medium} • {p.utm_campaign}
                  </div>
                </div>
                <div className="presetActions">
                  <button className="btn" type="button" onClick={() => loadPreset(p)}>
                    Load
                  </button>
                  <button className="btn" type="button" onClick={() => copy(buildUrlFromPreset(p))}>
                    Copy URL
                  </button>
                  <button className="btnDanger" type="button" onClick={() => deletePreset(p.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

