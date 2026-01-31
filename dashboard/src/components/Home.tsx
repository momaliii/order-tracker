import './Home.css';

export default function Home(props: { onLoginClick: () => void }) {
  return (
    <div className="homeWrap">
      <div className="homeTop">
        <div>
          <div className="homeKicker">Ecommerce Attribution Tracker</div>
          <h1 className="homeTitle">Track real revenue by platform → campaign → creative</h1>
          <p className="homeSub">
            One website snippet + EasyOrders webhook ingestion + a dashboard for attribution and revenue reporting.
          </p>
          <div className="homeActions">
            <button className="homeBtnPrimary" onClick={props.onLoginClick} type="button">
              Login to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="homeGrid">
        <div className="homeCard">
          <h2>1) Install tracker</h2>
          <p>Paste the generated snippet on your store (all pages) or via GTM.</p>
        </div>
        <div className="homeCard">
          <h2>2) Use clean UTMs</h2>
          <p>Build UTM links and naming conventions so every click is attributable.</p>
        </div>
        <div className="homeCard">
          <h2>3) Connect EasyOrders</h2>
          <p>Set the webhook URL + secret, then orders appear with revenue.</p>
        </div>
      </div>

      <div className="homeFooter">
        <div className="homeFooterInner">
          <div className="homeSmall">
            Tip: for best results, standardize naming (campaign/adset/ad/creative) and always use UTMs.
          </div>
        </div>
      </div>
    </div>
  );
}

