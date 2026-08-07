import { useState, useMemo } from 'react';
import { useStoredState } from '../hooks/useStoredState.js';
import { DEFAULT_COSTS, DEFAULT_PASTURES } from '../data/defaults.js';
import PricingPanel, { useTrialState } from '../components/PricingPanel.jsx';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;

function relTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function HomeTab({ navigate, user }) {
  const [showPricing, setShowPricing] = useState(false);
  const [trial] = useTrialState();
  const pastures = load('arpent.pastures', DEFAULT_PASTURES);
  const costs = load('arpent.costs', DEFAULT_COSTS);
  const [headCount] = useStoredState('arpent.headCount', 281);
  const [marketPrice] = useStoredState('arpent.marketPrice', 192);
  const animals = load('arpent.animals', []);
  const lots = load('arpent.lots', []);
  const treatments = load('arpent.treatments', []);
  const history = load('arpent.pastureHistory', []);

  const summary = useMemo(() => {
    let cattleHead = 0;
    let sheepHead = 0;

    if (animals.length > 0) {
      animals.forEach((a) => {
        const h = a.headCount || 1;
        if (a.species === 'sheep') sheepHead += h;
        else cattleHead += h;
      });
    } else {
      pastures.forEach((p) => {
        if (p.species === 'sheep') sheepHead += (p.head || 0);
        else cattleHead += (p.head || 0);
      });
    }

    const monthly = costs.reduce((a, c) => a + (c.val || 0), 0);
    const totalHead = headCount || (cattleHead + sheepHead) || 1;
    const daily = totalHead > 0 ? monthly / 30 / totalHead : 0;
    const yearly = monthly * 12;
    const breakeven = totalHead > 0 ? Math.round((yearly / totalHead) / 7.5 * 100) / 100 : 0;
    const margin = marketPrice - breakeven;

    return { cattleHead, sheepHead, daily, breakeven, marketPrice, margin };
  }, [animals, pastures, costs, headCount, marketPrice]);

  const feed = useMemo(() => {
    const items = [];

    const recentLots = lots
      .filter((l) => l.ts)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 3);

    recentLots.forEach((l) => {
      items.push({
        color: 'var(--accent)',
        text: `${l.setupName || l.className || 'Lot'} — bought ${l.head} hd @ $${l.weight > 0 ? Math.round(l.pricePerHead / (l.weight / 100)) : '—'}/cwt`,
        time: relTime(l.ts),
        ts: l.ts,
      });
    });

    treatments
      .filter((t) => t.ts)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 3)
      .forEach((t) => {
        items.push({
          color: 'var(--rust)',
          text: `${t.animalLabel || 'Tag'} — ${t.drug} treatment logged${t.withdrawalDays ? `, ${t.withdrawalDays}-day withdrawal` : ''}`,
          time: relTime(t.ts),
          ts: t.ts,
        });
      });

    history
      .slice(0, 3)
      .forEach((h) => {
        items.push({
          color: 'var(--ok-fill)',
          text: `${h.pasture} — ${h.action}`,
          time: h.date || '',
          ts: 0,
        });
      });

    pastures
      .filter((p) => !p.resting && p.grazeDays > 0)
      .sort((a, b) => (b.grazeDays / b.totalDays) - (a.grazeDays / a.totalDays))
      .slice(0, 2)
      .forEach((p) => {
        items.push({
          color: 'var(--ok-fill)',
          text: `${p.name} — ${p.head} head, Day ${p.grazeDays} of ${p.totalDays}`,
          time: 'active',
          ts: 0,
        });
      });

    items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return items.slice(0, 5);
  }, [lots, treatments, history, pastures]);

  const hasFeed = feed.length > 0;

  return (
    <section className="screen on">
      {showPricing && (
        <PricingPanel onClose={() => setShowPricing(false)} user={user} />
      )}

      <div
        className="home-plan-card"
        onClick={() => setShowPricing(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setShowPricing(true)}
      >
        <div className="home-plan-info">
          <div className="home-plan-label">
            {trial.isPaid ? 'Your Plan' : 'Free Trial'}
          </div>
          <div className="home-plan-value">
            {trial.isLifetime
              ? 'Lifetime Pro'
              : trial.plan === 'monthly'
                ? 'Monthly — $10/mo'
                : `${trial.remaining} days left`}
          </div>
          {!trial.isPaid && trial.totalEarned < 90 && (
            <div className="home-plan-sub">Earn up to {90 - trial.totalEarned} more free days</div>
          )}
        </div>
        <button className="home-plan-btn" onClick={(e) => { e.stopPropagation(); setShowPricing(true); }}>
          {trial.isPaid ? 'Manage' : 'Upgrade'}
        </button>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="tl">Cattle</div>
          <div className="tv">{summary.cattleHead}</div>
          <div className="ts">head</div>
        </div>
        <div className="tile">
          <div className="tl">Sheep</div>
          <div className="tv">{summary.sheepHead}</div>
          <div className="ts">head</div>
        </div>
        <div className="tile">
          <div className="tl">Daily Cost</div>
          <div className="tv">${summary.daily.toFixed(2)}</div>
          <div className="ts">per head</div>
        </div>
        <div className="tile">
          <div className="tl">Breakeven</div>
          <div className="tv">${Math.round(summary.breakeven)}</div>
          <div className="ts">per cwt</div>
        </div>
      </div>

      <div className="tile-dark card" style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div className="tl" style={{ color: 'var(--nav-muted)' }}>Market Position</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ font: '600 28px/1 var(--serif)', color: '#F6F2EA' }}>${summary.marketPrice}</span>
          <span style={{ font: '400 14px/1 var(--sans)', color: 'var(--nav-text)' }}>/cwt</span>
          <span
            className={`pill ${summary.margin >= 0 ? 'pill-ok' : 'pill-bad'}`}
            style={{ marginLeft: 'auto' }}
          >
            {summary.margin >= 0 ? `+$${Math.round(summary.margin)} margin` : `$${Math.round(Math.abs(summary.margin))} below`}
          </span>
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
      {hasFeed ? (
        feed.map((item, i) => (
          <div key={i} className="feed-item">
            <div className="feed-dot" style={{ background: item.color }} />
            <div>
              <div className="feed-text">{item.text}</div>
              <div className="feed-time">{item.time}</div>
            </div>
          </div>
        ))
      ) : (
        <p style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink3)', textAlign: 'center', padding: 16 }}>
          Activity will show here as you log treatments, purchases, and pasture moves.
        </p>
      )}
    </section>
  );
}
