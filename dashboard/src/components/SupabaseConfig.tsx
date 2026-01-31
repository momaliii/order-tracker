import './SupabaseConfig.css';

export default function SupabaseConfig() {
  return (
    <div className="cfgWrap">
      <div className="cfgCard">
        <h1>Configure Supabase Auth</h1>
        <p className="cfgSub">
          The dashboard needs Supabase env vars to enable login.
        </p>

        <div className="cfgStep">
          <div className="cfgTitle">1) Create `dashboard/.env.local`</div>
          <pre className="cfgCode">{`VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-anon-key>"
VITE_API_URL="http://localhost:3000"`}</pre>
        </div>

        <div className="cfgStep">
          <div className="cfgTitle">2) Restart the dashboard</div>
          <pre className="cfgCode">{`cd dashboard
npm run dev`}</pre>
        </div>

        <div className="cfgStep">
          <div className="cfgTitle">Where to get the values</div>
          <ul className="cfgList">
            <li>
              <b>VITE_SUPABASE_URL</b>: Supabase Project URL
            </li>
            <li>
              <b>VITE_SUPABASE_ANON_KEY</b>: Supabase Anon/Publishable key
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

