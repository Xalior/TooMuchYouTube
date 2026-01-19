const settings = {
  channelMatches: "",
  videoIdMatches: "",
  titleMatches: "",
  playbackSpeed: ""
};

function parseList(raw) {
  return raw
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalize(value) {
  return value.toLowerCase();
}

function getVideoIdFromUrl() {
  const url = new URL(window.location.href);
  const v = url.searchParams.get("v");
  if (v) return v;
  if (url.pathname.startsWith("/shorts/")) {
    return url.pathname.split("/shorts/")[1].split(/[?&#/]/)[0] || "";
  }
  return "";
}

function getTitle() {
  const titleEl = document.querySelector("h1 yt-formatted-string, h1.title");
  if (titleEl && titleEl.textContent) return titleEl.textContent.trim();
  return document.title.replace(" - YouTube", "").trim();
}

function getChannelCandidates() {
  const candidates = new Set();

  const textNodes = document.querySelectorAll(
    "ytd-channel-name a, #text-container.ytd-channel-name, ytd-video-owner-renderer a, ytd-video-owner-renderer #text"
  );
  textNodes.forEach((node) => {
    if (node && node.textContent) candidates.add(node.textContent.trim());
  });

  const ownerLinks = document.querySelectorAll(
    "ytd-video-owner-renderer a[href], ytd-channel-name a[href]"
  );
  ownerLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const handleMatch = href.match(/\/(@[^/?#]+)/);
    if (handleMatch) candidates.add(handleMatch[1]);
    const channelMatch = href.match(/\/channel\/([^/?#]+)/);
    if (channelMatch) candidates.add(channelMatch[1]);
  });

  const authorMeta = document.querySelector('meta[itemprop="author"]');
  if (authorMeta && authorMeta.getAttribute("content")) {
    candidates.add(authorMeta.getAttribute("content").trim());
  }

  const channelIdMeta = document.querySelector('meta[itemprop="channelId"]');
  if (channelIdMeta && channelIdMeta.getAttribute("content")) {
    candidates.add(channelIdMeta.getAttribute("content").trim());
  }

  if (window.ytInitialPlayerResponse?.videoDetails?.author) {
    candidates.add(window.ytInitialPlayerResponse.videoDetails.author.trim());
  }

  return Array.from(candidates).filter(Boolean);
}

function hasMatch({ channels, title, videoId }) {
  const channelList = parseList(settings.channelMatches);
  const titleList = parseList(settings.titleMatches);
  const videoIdList = parseList(settings.videoIdMatches);

  const channelMatch =
    channelList.length > 0 &&
    channels.length > 0 &&
    channelList.some((entry) =>
      channels.some((channel) => normalize(channel).includes(normalize(entry)))
    );

  const titleMatch =
    titleList.length > 0 &&
    title &&
    titleList.some((entry) => normalize(title).includes(normalize(entry)));

  const videoIdMatch =
    videoIdList.length > 0 &&
    videoId &&
    videoIdList.some((entry) => entry === videoId);

  return channelMatch || titleMatch || videoIdMatch;
}

let appliedForKey = null;

function getMatchKey() {
  return getVideoIdFromUrl() || window.location.href;
}

function applyPlaybackRateOnce() {
  if (!settings.playbackSpeed) return false;

  const playbackSpeed = Number(settings.playbackSpeed);
  if (!Number.isFinite(playbackSpeed) || playbackSpeed <= 0) return false;

  const videos = Array.from(document.querySelectorAll("video"));
  if (videos.length === 0) return false;

  let applied = false;
  videos.forEach((video) => {
    if (video.readyState >= 1) {
      video.playbackRate = playbackSpeed;
      applied = true;
      return;
    }
    const onMetadata = () => {
      video.playbackRate = playbackSpeed;
    };
    video.addEventListener("loadedmetadata", onMetadata, { once: true });
    applied = true;
  });

  return applied;
}

let pendingCheck = null;

function scheduleEvaluate() {
  if (pendingCheck) return;
  pendingCheck = window.setTimeout(() => {
    pendingCheck = null;
    evaluateAndApply();
  }, 150);
}

function evaluateAndApply() {
  if (!window.location.hostname.includes("youtube.com")) return;

  const matchKey = getMatchKey();
  if (appliedForKey === matchKey) return;

  const channels = getChannelCandidates();
  const title = getTitle();
  const videoId = getVideoIdFromUrl();

  const matched = hasMatch({ channels, title, videoId });

  if (!matched) return;

  if (applyPlaybackRateOnce()) {
    appliedForKey = matchKey;
  }
}

function refreshSettings() {
  chrome.storage.sync.get(settings, (data) => {
    settings.channelMatches = data.channelMatches || "";
    settings.titleMatches = data.titleMatches || "";
    settings.videoIdMatches = data.videoIdMatches || "";
    settings.playbackSpeed = data.playbackSpeed || "";
    appliedForKey = null;
    evaluateAndApply();
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (
    changes.channelMatches ||
    changes.titleMatches ||
    changes.videoIdMatches ||
    changes.playbackSpeed
  ) {
    refreshSettings();
  }
});

window.addEventListener("yt-navigate-finish", () => {
  appliedForKey = null;
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
