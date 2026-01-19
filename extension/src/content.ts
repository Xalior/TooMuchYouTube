import { isYouTubeHost } from './domains';

type RuleType = 'channel' | 'title' | 'videoId';

type Rule = {
  id?: string;
  type: RuleType;
  value: string;
  speed: string;
};

type Settings = {
  rules: Rule[];
};

type PlayerApi = {
  setPlaybackRate: (rate: number) => void;
};

type MatchContext = {
  channels: string[];
  title: string;
  videoId: string;
};

const settings: Settings = {
  rules: []
};

function normalize(value: string) {
  return value.toLowerCase();
}

function getVideoIdFromUrl() {
  const url = new URL(window.location.href);
  if (url.hostname === 'youtu.be') {
    return url.pathname.split('/')[1]?.split(/[?&#/]/)[0] || '';
  }
  const v = url.searchParams.get('v');
  if (v) return v;
  if (url.pathname.startsWith('/shorts/')) {
    return url.pathname.split('/shorts/')[1].split(/[?&#/]/)[0] || '';
  }
  return '';
}

function getTitle() {
  const titleEl = document.querySelector('h1 yt-formatted-string, h1.title');
  if (titleEl && titleEl.textContent) return titleEl.textContent.trim();
  return document.title.replace(' - YouTube', '').trim();
}

function getChannelCandidates() {
  const candidates = new Set<string>();

  const textNodes = document.querySelectorAll(
    'ytd-channel-name a, #text-container.ytd-channel-name, ytd-video-owner-renderer a, ytd-video-owner-renderer #text'
  );
  textNodes.forEach((node) => {
    if (node && node.textContent) candidates.add(node.textContent.trim());
  });

  const ownerLinks = document.querySelectorAll(
    'ytd-video-owner-renderer a[href], ytd-channel-name a[href]'
  );
  ownerLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const handleMatch = href.match(/\/(@[^/?#]+)/);
    if (handleMatch) candidates.add(handleMatch[1]);
    const channelMatch = href.match(/\/channel\/([^/?#]+)/);
    if (channelMatch) candidates.add(channelMatch[1]);
  });

  const authorMeta = document.querySelector('meta[itemprop="author"]');
  if (authorMeta && authorMeta.getAttribute('content')) {
    candidates.add(authorMeta.getAttribute('content')?.trim() || '');
  }

  const channelIdMeta = document.querySelector('meta[itemprop="channelId"]');
  if (channelIdMeta && channelIdMeta.getAttribute('content')) {
    candidates.add(channelIdMeta.getAttribute('content')?.trim() || '');
  }

  if (window.ytInitialPlayerResponse?.videoDetails?.author) {
    candidates.add(window.ytInitialPlayerResponse.videoDetails.author.trim());
  }

  return Array.from(candidates).filter(Boolean);
}

function matchesRule(rule: Rule, { channels, title, videoId }: MatchContext) {
  if (!rule || !rule.value) return false;
  const ruleValue = normalize(rule.value);

  if (rule.type === 'channel') {
    return (
      channels.length > 0 &&
      channels.some((channel) => normalize(channel).includes(ruleValue))
    );
  }

  if (rule.type === 'title') {
    return title && normalize(title).includes(ruleValue);
  }

  if (rule.type === 'videoId') {
    return videoId && rule.value.trim() === videoId;
  }

  return false;
}

let appliedForKey: string | null = null;
let appliedForVideo: HTMLVideoElement | null = null;
let manualOverrideForVideo: HTMLVideoElement | null = null;
const rateChangeListeners = new WeakSet<HTMLVideoElement>();
let lastProgrammaticRateSet = 0;

function getMatchKey() {
  return getVideoIdFromUrl() || window.location.href;
}

const PAGE_SYNC_CHANNEL = 'TMY_PLAYBACK_RATE_SYNC';

function setPlaybackRateInPage(playbackSpeed: number) {
  window.postMessage(
    { channel: PAGE_SYNC_CHANNEL, type: 'setPlaybackRate', rate: playbackSpeed },
    '*'
  );
}

function getPlayerApis() {
  const apis: PlayerApi[] = [];
  const moviePlayer = document.getElementById('movie_player') as
    | (PlayerApi & HTMLElement)
    | null;
  if (moviePlayer && typeof moviePlayer.setPlaybackRate === 'function') {
    apis.push(moviePlayer);
  }

  const ytdPlayer = document.querySelector('ytd-player') as
    | (HTMLElement & { getPlayer?: () => PlayerApi | null; player_?: PlayerApi | null })
    | null;
  if (ytdPlayer) {
    if (typeof ytdPlayer.getPlayer === 'function') {
      const inner = ytdPlayer.getPlayer();
      if (inner && typeof inner.setPlaybackRate === 'function') {
        apis.push(inner);
      }
    }
    const legacy = ytdPlayer.player_;
    if (legacy && typeof legacy.setPlaybackRate === 'function') {
      apis.push(legacy);
    }
  }

  return apis;
}

function setVideoPlaybackRate(video: HTMLVideoElement, playbackSpeed: number) {
  if (video.playbackRate === playbackSpeed) return;
  lastProgrammaticRateSet = Date.now();
  video.playbackRate = playbackSpeed;
}

function registerRateChangeListener(video: HTMLVideoElement, targetRate: number) {
  if (rateChangeListeners.has(video)) return;
  rateChangeListeners.add(video);

  video.addEventListener('ratechange', () => {
    if (!video.isConnected) return;
    const currentRate = video.playbackRate;
    if (currentRate === targetRate) return;
    if (Date.now() - lastProgrammaticRateSet < 400) return;
    manualOverrideForVideo = video;
    if (syncIntervalId) {
      window.clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
  });
}

let syncIntervalId: number | null = null;
let syncToken = 0;

function syncPlaybackRateWithPlayer(playbackSpeed: number) {
  const maxAttempts = 30;
  const retryDelayMs = 350;
  const token = (syncToken += 1);
  let attempts = 0;

  if (syncIntervalId) {
    window.clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  const trySync = () => {
    if (token !== syncToken) return;
    attempts += 1;
    const video = document.querySelector('video');
    const apis = getPlayerApis();
    if (manualOverrideForVideo && manualOverrideForVideo === video) {
      if (syncIntervalId) {
        window.clearInterval(syncIntervalId);
        syncIntervalId = null;
      }
      return;
    }

    setPlaybackRateInPage(playbackSpeed);

    apis.forEach((api) => {
      if (typeof api.setPlaybackRate !== 'function') return;
      try {
        api.setPlaybackRate(playbackSpeed);
      } catch (err) {
        // Ignore player API failures; fallback to direct video updates.
      }
    });

    if (video && (video as HTMLVideoElement).playbackRate !== playbackSpeed) {
      setVideoPlaybackRate(video as HTMLVideoElement, playbackSpeed);
    }

    if (attempts >= maxAttempts) {
      window.clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
  };

  trySync();
  syncIntervalId = window.setInterval(trySync, retryDelayMs);
}

function applyPlaybackRateOnce(speed: string) {
  if (!speed) return false;

  const playbackSpeed = Number(speed);
  if (!Number.isFinite(playbackSpeed) || playbackSpeed <= 0) return false;

  let applied = false;

  const videos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
  if (videos.length === 0) return applied;

  videos.forEach((video) => {
    registerRateChangeListener(video, playbackSpeed);
    if (video.readyState >= 1) {
      setVideoPlaybackRate(video, playbackSpeed);
      applied = true;
      return;
    }
    const onMetadata = () => {
      setVideoPlaybackRate(video, playbackSpeed);
    };
    video.addEventListener('loadedmetadata', onMetadata, { once: true });
    video.addEventListener(
      'playing',
      () => {
        syncPlaybackRateWithPlayer(playbackSpeed);
      },
      { once: true }
    );
    applied = true;
  });

  syncPlaybackRateWithPlayer(playbackSpeed);
  appliedForVideo = videos[0] || null;

  return applied;
}

let pendingCheck: number | null = null;

function scheduleEvaluate() {
  if (pendingCheck) return;
  pendingCheck = window.setTimeout(() => {
    pendingCheck = null;
    evaluateAndApply();
  }, 150);
}

function evaluateAndApply() {
  if (!isYouTubeHost(window.location.hostname)) return;

  const matchKey = getMatchKey();
  if (appliedForKey === matchKey) {
    const currentVideo = document.querySelector('video') as HTMLVideoElement | null;
    if (
      appliedForVideo &&
      currentVideo &&
      appliedForVideo === currentVideo &&
      currentVideo.isConnected
    ) {
      return;
    }
    if (currentVideo && appliedForVideo !== currentVideo) {
      manualOverrideForVideo = null;
    }
  }

  const channels = getChannelCandidates();
  const title = getTitle();
  const videoId = getVideoIdFromUrl();

  for (const rule of settings.rules) {
    if (!matchesRule(rule, { channels, title, videoId })) continue;
    if (applyPlaybackRateOnce(rule.speed)) {
      appliedForKey = matchKey;
    }
    return;
  }
}

function refreshSettings() {
  chrome.storage.sync.get(settings, (data) => {
    settings.rules = data.rules || [];
    appliedForKey = null;
    appliedForVideo = null;
    manualOverrideForVideo = null;
    evaluateAndApply();
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.rules) {
    refreshSettings();
  }
});

window.addEventListener('yt-navigate-finish', () => {
  appliedForKey = null;
  appliedForVideo = null;
  manualOverrideForVideo = null;
  scheduleEvaluate();
});

const observer = new MutationObserver(() => {
  scheduleEvaluate();
});

observer.observe(document.documentElement, { childList: true, subtree: true });

refreshSettings();

let startupAttempts = 0;
const startupInterval = window.setInterval(() => {
  scheduleEvaluate();
  startupAttempts += 1;
  if (startupAttempts >= 20) {
    window.clearInterval(startupInterval);
  }
}, 500);
