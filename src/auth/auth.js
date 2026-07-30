const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDHI-_3bZANlicN6vWCLv2jCPgNSSjchY4',
  authDomain: 'back-forty-app.firebaseapp.com',
  projectId: 'back-forty-app',
  storageBucket: 'back-forty-app.firebasestorage.app',
  messagingSenderId: '646932283421',
  appId: '1:646932283421:web:c1b2606f788adb827206f4',
};

const CACHE_KEY = 'arpent.user';

let authPromise = null;

async function getAuth() {
  if (!authPromise) {
    authPromise = (async () => {
      const [{ initializeApp }, auth] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
      ]);
      const app = initializeApp(FIREBASE_CONFIG);
      return { auth: auth.getAuth(app), sdk: auth };
    })();
  }
  return authPromise;
}

export function cachedUser() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheUser(user) {
  try {
    if (user) localStorage.setItem(CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(CACHE_KEY);
  } catch { /* private mode */ }
}

export async function signIn() {
  const { auth, sdk } = await getAuth();
  const provider = new sdk.GoogleAuthProvider();
  let cred;
  try {
    cred = await sdk.signInWithPopup(auth, provider);
  } catch (err) {
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
      await sdk.signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
  const user = { email: cred.user.email, name: cred.user.displayName || '' };
  cacheUser(user);
  return user;
}

export async function currentIdToken() {
  if (!cachedUser()) return null;
  try {
    const { auth } = await getAuth();
    if (auth.authStateReady) await auth.authStateReady();
    const u = auth.currentUser;
    return u ? await u.getIdToken() : null;
  } catch {
    return null;
  }
}

export async function signOut() {
  cacheUser(null);
  try {
    const { auth, sdk } = await getAuth();
    await sdk.signOut(auth);
  } catch { /* already gone */ }
}

export async function resumeRedirect() {
  if (!cachedUser() && !sessionStorage.getItem('arpent.redirecting')) return null;
  try {
    const { auth, sdk } = await getAuth();
    const res = await sdk.getRedirectResult(auth);
    if (res?.user) {
      const user = { email: res.user.email, name: res.user.displayName || '' };
      cacheUser(user);
      return user;
    }
  } catch { /* nothing pending */ }
  return null;
}
