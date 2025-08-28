import { PKCEOAuthStrategy } from 'art-framework';

// Minimal callback handler for new-tab PKCE flows.
// The authorization server should redirect to this page with ?code=...&state=...
(async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    // Extract BroadcastChannel name from state if present
    let channelName = 'art-auth';
    if (state) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(state.replace(/-/g, '+').replace(/_/g, '/')))));
        if (decoded?.ch && typeof decoded.ch === 'string') channelName = decoded.ch;
      } catch {}
    }

    // Broadcast the code to the opener/origin via BroadcastChannel; PKCE strategy in opener will exchange it
    const channel = new BroadcastChannel(channelName);
    channel.postMessage({ type: 'art-auth-code', code });
  } catch (e) {
    // ignore
  } finally {
    try { window.close(); } catch {}
  }
})();


