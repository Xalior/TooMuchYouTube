(() => {
  if (window.__tmyPlaybackRateBridgeInstalled) return;
  window.__tmyPlaybackRateBridgeInstalled = true;

  const CHANNEL = "TMY_PLAYBACK_RATE_SYNC";

  function setRate(rate) {
    const playbackSpeed = Number(rate);
    if (!Number.isFinite(playbackSpeed) || playbackSpeed <= 0) return;

    const apis = [];
    const player = document.getElementById("movie_player");
    if (player && typeof player.setPlaybackRate === "function") apis.push(player);

    const ytdPlayer = document.querySelector("ytd-player");
    if (ytdPlayer) {
      if (typeof ytdPlayer.getPlayer === "function") {
        const inner = ytdPlayer.getPlayer();
        if (inner && typeof inner.setPlaybackRate === "function") apis.push(inner);
      }
      const legacy = ytdPlayer.player_;
      if (legacy && typeof legacy.setPlaybackRate === "function") apis.push(legacy);
    }

    apis.forEach((api) => {
      try {
        api.setPlaybackRate(playbackSpeed);
      } catch (err) {
        // Ignore player API failures.
      }
    });

    try {
      const key = "yt-player-playback-rate";
      const raw = localStorage.getItem(key);
      let payload = raw ? JSON.parse(raw) : {};
      if (!payload || typeof payload !== "object") payload = {};
      payload.data = String(playbackSpeed);
      if (!payload.expiration) {
        payload.expiration = Date.now() + 365 * 24 * 60 * 60 * 1000;
      }
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (err) {
      // Ignore localStorage failures.
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL) return;
    if (data.type === "setPlaybackRate") {
      setRate(data.rate);
    }
  });
})();
