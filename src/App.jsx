import { useState, useCallback, useEffect } from 'react';
import { useStoredState } from './hooks/useStoredState';
import { cachedUser, signIn, signOut, resumeRedirect } from './auth/auth.js';
import { isApprovedEmail } from './auth/users.js';
import { friendlyError } from './lib/errors.js';
import BootScreen from './components/BootScreen';
import TopBar from './components/TopBar';
import SubTabs from './components/SubTabs';
import BottomNav from './components/BottomNav';
import HomeTab from './tabs/HomeTab';
import HerdTab from './tabs/HerdTab';
import LandTab from './tabs/LandTab';
import MarketTab from './tabs/MarketTab';
import './components/AppShell.css';

const HERD_TABS = [
  { id: 'animals', label: 'Animals' },
  { id: 'health', label: 'Health' },
  { id: 'breeding', label: 'Breeding' },
];

const LAND_TABS = [
  { id: 'pastures', label: 'Pastures' },
  { id: 'scan', label: 'Forage' },
  { id: 'rotation', label: 'Rotation' },
  { id: 'conditions', label: 'Conditions' },
];

const MARKET_TABS = [
  { id: 'costs', label: 'Costs' },
  { id: 'auction', label: 'Auction' },
  { id: 'sell', label: 'Sell' },
];

const SUB_TAB_MAP = { herd: HERD_TABS, land: LAND_TABS, market: MARKET_TABS };
const DEFAULT_SUBS = { herd: 'animals', land: 'pastures', market: 'costs' };

export default function App() {
  const [booted, setBooted] = useState(false);
  const [tab, setTab] = useStoredState('arpent.tab', 'home');
  const [subs, setSubs] = useStoredState('arpent.subs', DEFAULT_SUBS);
  const [theme, setTheme] = useStoredState('arpent.theme', 'day');
  const [zip, setZip] = useStoredState('arpent.zip', '67646');
  const [user, setUser] = useState(() => cachedUser());
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    resumeRedirect().then((u) => { if (u) setUser(u); });
  }, []);

  const handleSignIn = useCallback(async () => {
    setAuthError(null);
    try {
      const u = await signIn();
      if (!u) return;
      if (!isApprovedEmail(u.email)) {
        await signOut();
        setAuthError('Not on the approved list. Contact the admin to request access.');
        return;
      }
      setUser(u);
    } catch (err) {
      setAuthError(friendlyError(err));
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
    setAuthError(null);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'day' ? 'field' : 'day';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }, [theme, setTheme]);

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  const handleSubChange = useCallback((id) => {
    setSubs((prev) => ({ ...prev, [tab]: id }));
  }, [tab, setSubs]);

  const navigate = useCallback((t, s) => {
    setTab(t);
    if (s) setSubs((prev) => ({ ...prev, [t]: s }));
  }, [setTab, setSubs]);

  const subTabs = SUB_TAB_MAP[tab] || null;
  const activeSub = subs[tab] || null;

  return (
    <>
      {!booted && <BootScreen onDone={() => setBooted(true)} />}
      <div className={`app-shell ${booted ? 'ready' : ''}`}>
        <TopBar
          theme={theme}
          onToggleTheme={toggleTheme}
          user={user}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          authError={authError}
        />
        {subTabs && (
          <SubTabs tabs={subTabs} active={activeSub} onChange={handleSubChange} />
        )}
        <main className="content">
          {tab === 'home' && <HomeTab navigate={navigate} />}
          {tab === 'herd' && <HerdTab sub={activeSub} />}
          {tab === 'land' && <LandTab sub={activeSub} zip={zip} />}
          {tab === 'market' && <MarketTab sub={activeSub} zip={zip} onZipChange={setZip} />}
        </main>
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </>
  );
}
