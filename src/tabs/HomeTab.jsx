export default function HomeTab({ navigate }) {
  return (
    <section className="screen on">
      <div className="tiles">
        <div className="tile">
          <div className="tl">Cattle</div>
          <div className="tv">247</div>
          <div className="ts">head</div>
        </div>
        <div className="tile">
          <div className="tl">Sheep</div>
          <div className="tv">34</div>
          <div className="ts">head</div>
        </div>
        <div className="tile">
          <div className="tl">Daily Cost</div>
          <div className="tv">$1.42</div>
          <div className="ts">per head</div>
        </div>
        <div className="tile">
          <div className="tl">Breakeven</div>
          <div className="tv">$186</div>
          <div className="ts">per cwt</div>
        </div>
      </div>

      <div className="tile-dark card" style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div className="tl" style={{ color: 'var(--nav-muted)' }}>Market Position</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ font: '600 28px/1 var(--serif)', color: '#F6F2EA' }}>$192</span>
          <span style={{ font: '400 14px/1 var(--sans)', color: 'var(--nav-text)' }}>/cwt</span>
          <span className="pill pill-ok" style={{ marginLeft: 'auto' }}>+$6 margin</span>
        </div>
      </div>

      <div className="actions">
        <button className="act-btn" onClick={() => navigate('land', 'scan')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="12" cy="12" r="3" />
            <circle cx="18" cy="6" r="1.5" fill="currentColor" />
          </svg>
          Scan Pasture
        </button>
        <button className="act-btn outline" onClick={() => navigate('market', 'auction')}>Check Bid</button>
        <button className="act-btn outline" onClick={() => navigate('herd', 'health')}>Log Treatment</button>
      </div>

      <div className="sh">Recent Activity</div>
      <div className="feed-item">
        <div className="feed-dot" style={{ background: 'var(--ok-fill)' }} />
        <div>
          <div className="feed-text"><strong>North 80</strong> — moved 45 head, Day 18 of 21</div>
          <div className="feed-time">2 hours ago</div>
        </div>
      </div>
      <div className="feed-item">
        <div className="feed-dot" style={{ background: 'var(--rust)' }} />
        <div>
          <div className="feed-text"><strong>Tag #422</strong> — Draxxin treatment logged, 38-day withdrawal</div>
          <div className="feed-time">Yesterday</div>
        </div>
      </div>
      <div className="feed-item">
        <div className="feed-dot" style={{ background: 'var(--accent)' }} />
        <div>
          <div className="feed-text"><strong>Pratt sale</strong> — bought 12 hd @ $174/cwt, $43 under ceiling</div>
          <div className="feed-time">3 days ago</div>
        </div>
      </div>
      <div className="feed-item">
        <div className="feed-dot" style={{ background: 'var(--ok-fill)' }} />
        <div>
          <div className="feed-text"><strong>East Pasture</strong> — scan: 1,840 lb/ac usable, room to run</div>
          <div className="feed-time">4 days ago</div>
        </div>
      </div>
    </section>
  );
}
