const MESSAGES = {
  400: "Something didn't look right — double-check and try again.",
  401: "Your key or sign-in isn't valid — try signing out and back in.",
  402: "That's a Pro feature — ask the admin about upgrading.",
  403: "You don't have access to that — check with the admin.",
  404: "Couldn't find what you're looking for — it may have been moved or deleted.",
  408: "Request timed out — cell signal might be weak, try again when you have a bar or two.",
  429: "Slow down — you've hit the limit. Wait a minute and try again.",
  500: "Something broke on our end — not your fault. Try again in a few minutes.",
  502: "Server's having a moment — try again shortly.",
  503: "Service is temporarily down — usually back in a few minutes.",
  0: "Can't reach the server — check your connection and try again.",
};

export function friendlyError(err) {
  if (!err) return 'Something went wrong. Try again.';

  if (err.code === 'auth/popup-blocked') return 'Pop-up was blocked — tap Sign In again and allow pop-ups for this site.';
  if (err.code === 'auth/network-request-failed') return 'No connection — check your signal and try again.';
  if (err.code === 'auth/user-cancelled') return "Sign-in was cancelled — tap Sign In when you're ready.";
  if (err.code === 'auth/popup-closed-by-user') return 'Sign-in window was closed — tap Sign In to try again.';

  const status = err.status || err.statusCode || (err.response && err.response.status) || 0;
  if (MESSAGES[status]) return MESSAGES[status];

  if (typeof err.message === 'string' && err.message.toLowerCase().includes('network')) {
    return MESSAGES[0];
  }

  return err.message || 'Something went wrong. Try again.';
}
