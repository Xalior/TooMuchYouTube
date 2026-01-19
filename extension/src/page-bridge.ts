export {};

(() => {
  if (window.__tmyPlaybackRateBridgeInstalled) return;
  window.__tmyPlaybackRateBridgeInstalled = true;

  const CHANNEL = 'TMY_PLAYBACK_RATE_SYNC';

  type PlayerApi = {
    setPlaybackRate: (rate: number) => void;
  };

  function setRate(rate: unknown) {
    const playbackSpeed = Number(rate);
    if (!Number.isFinite(playbackSpeed) || playbackSpeed <= 0) return;

    const apis: PlayerApi[] = [];
    const player = document.getElementById('movie_player') as
      | (PlayerApi & HTMLElement)
      | null;
    if (player && typeof player.setPlaybackRate === 'function') apis.push(player);

    const ytdPlayer = document.querySelector('ytd-player') as
      | (HTMLElement & { getPlayer?: () => PlayerApi | null; player_?: PlayerApi | null })
      | null;
    if (ytdPlayer) {
      if (typeof ytdPlayer.getPlayer === 'function') {
        const inner = ytdPlayer.getPlayer();
        if (inner && typeof inner.setPlaybackRate === 'function') apis.push(inner);
      }
      const legacy = ytdPlayer.player_;
      if (legacy && typeof legacy.setPlaybackRate === 'function') apis.push(legacy);
    }

    apis.forEach((api) => {
      try {
        api.setPlaybackRate(playbackSpeed);
      } catch (err) {
        // Ignore player API failures.
      }
    });
  }

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data as { channel?: string; type?: string; rate?: number };
    if (!data || data.channel !== CHANNEL) return;
    if (data.type === 'setPlaybackRate') {
      setRate(data.rate);
    }
  });
})();
