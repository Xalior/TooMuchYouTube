(() => {
  // extension/src/domains.ts
  var YOUTUBE_DOMAINS = [
    "youtu.be",
    "youtube-nocookie.com",
    "youtube.ae",
    "youtube.al",
    "youtube.am",
    "youtube.at",
    "youtube.az",
    "youtube.ba",
    "youtube.be",
    "youtube.bg",
    "youtube.bh",
    "youtube.bo",
    "youtube.by",
    "youtube.ca",
    "youtube.cat",
    "youtube.ch",
    "youtube.cl",
    "youtube.co",
    "youtube.co.ae",
    "youtube.co.at",
    "youtube.co.cr",
    "youtube.co.hu",
    "youtube.co.id",
    "youtube.co.il",
    "youtube.co.in",
    "youtube.co.jp",
    "youtube.co.ke",
    "youtube.co.kr",
    "youtube.co.ma",
    "youtube.co.nz",
    "youtube.co.th",
    "youtube.co.tz",
    "youtube.co.ug",
    "youtube.co.uk",
    "youtube.co.ve",
    "youtube.co.za",
    "youtube.co.zw",
    "youtube.com",
    "youtube.com.ar",
    "youtube.com.au",
    "youtube.com.az",
    "youtube.com.bd",
    "youtube.com.bh",
    "youtube.com.bo",
    "youtube.com.br",
    "youtube.com.by",
    "youtube.com.co",
    "youtube.com.do",
    "youtube.com.ec",
    "youtube.com.ee",
    "youtube.com.eg",
    "youtube.com.es",
    "youtube.com.gh",
    "youtube.com.gr",
    "youtube.com.gt",
    "youtube.com.hk",
    "youtube.com.hn",
    "youtube.com.hr",
    "youtube.com.jm",
    "youtube.com.jo",
    "youtube.com.kw",
    "youtube.com.lb",
    "youtube.com.lv",
    "youtube.com.ly",
    "youtube.com.mk",
    "youtube.com.mt",
    "youtube.com.mx",
    "youtube.com.my",
    "youtube.com.ng",
    "youtube.com.ni",
    "youtube.com.om",
    "youtube.com.pa",
    "youtube.com.pe",
    "youtube.com.ph",
    "youtube.com.pk",
    "youtube.com.pt",
    "youtube.com.py",
    "youtube.com.qa",
    "youtube.com.ro",
    "youtube.com.sa",
    "youtube.com.sg",
    "youtube.com.sv",
    "youtube.com.tn",
    "youtube.com.tr",
    "youtube.com.tw",
    "youtube.com.ua",
    "youtube.com.uy",
    "youtube.com.ve",
    "youtube.cr",
    "youtube.cz",
    "youtube.de",
    "youtube.dk",
    "youtube.ee",
    "youtube.es",
    "youtube.fi",
    "youtube.fr",
    "youtube.ge",
    "youtube.gr",
    "youtube.gt",
    "youtube.hk",
    "youtube.hr",
    "youtube.hu",
    "youtube.ie",
    "youtube.in",
    "youtube.iq",
    "youtube.is",
    "youtube.it",
    "youtube.jo",
    "youtube.jp",
    "youtube.kr",
    "youtube.kz",
    "youtube.la",
    "youtube.lk",
    "youtube.lt",
    "youtube.lu",
    "youtube.lv",
    "youtube.ly",
    "youtube.ma",
    "youtube.md",
    "youtube.me",
    "youtube.mk",
    "youtube.mn",
    "youtube.mx",
    "youtube.my",
    "youtube.ng",
    "youtube.ni",
    "youtube.nl",
    "youtube.no",
    "youtube.pa",
    "youtube.pe",
    "youtube.ph",
    "youtube.pk",
    "youtube.pl",
    "youtube.pr",
    "youtube.pt",
    "youtube.qa",
    "youtube.ro",
    "youtube.rs",
    "youtube.ru",
    "youtube.sa",
    "youtube.se",
    "youtube.sg",
    "youtube.si",
    "youtube.sk",
    "youtube.sn",
    "youtube.soy",
    "youtube.sv",
    "youtube.tn",
    "youtube.tv",
    "youtube.ua",
    "youtube.ug",
    "youtube.uy",
    "youtube.vn",
    "youtubeeducation.com",
    "youtubefanfest.com",
    "youtubegaming.com",
    "youtubego.co.id",
    "youtubego.co.in",
    "youtubego.com",
    "youtubego.com.br",
    "youtubego.id",
    "youtubego.in",
    "youtubekids.com",
    "youtubemobilesupport.com",
    "yt.be"
  ];
  var DOMAIN_SET = new Set(YOUTUBE_DOMAINS);
  function isYouTubeHost(hostname) {
    const host = hostname.toLowerCase();
    if (DOMAIN_SET.has(host)) return true;
    for (const domain of YOUTUBE_DOMAINS) {
      if (host.endsWith(`.${domain}`)) return true;
    }
    return false;
  }

  // extension/src/content.ts
  var settings = {
    rules: []
  };
  function normalize(value) {
    return value.toLowerCase();
  }
  function getVideoIdFromUrl() {
    const url = new URL(window.location.href);
    if (url.hostname === "youtu.be") {
      return url.pathname.split("/")[1]?.split(/[?&#/]/)[0] || "";
    }
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
    const candidates = /* @__PURE__ */ new Set();
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
      candidates.add(authorMeta.getAttribute("content")?.trim() || "");
    }
    const channelIdMeta = document.querySelector('meta[itemprop="channelId"]');
    if (channelIdMeta && channelIdMeta.getAttribute("content")) {
      candidates.add(channelIdMeta.getAttribute("content")?.trim() || "");
    }
    if (window.ytInitialPlayerResponse?.videoDetails?.author) {
      candidates.add(window.ytInitialPlayerResponse.videoDetails.author.trim());
    }
    return Array.from(candidates).filter(Boolean);
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "getQuickAddData") return;
    sendResponse({
      videoId: getVideoIdFromUrl(),
      channelCandidates: getChannelCandidates(),
      title: getTitle()
    });
  });
  function matchesRule(rule, { channels, title, videoId }) {
    if (!rule || !rule.value) return false;
    const ruleValue = normalize(rule.value);
    if (rule.type === "channel") {
      return channels.length > 0 && channels.some((channel) => normalize(channel).includes(ruleValue));
    }
    if (rule.type === "title") {
      return title && normalize(title).includes(ruleValue);
    }
    if (rule.type === "videoId") {
      return videoId && rule.value.trim() === videoId;
    }
    return false;
  }
  var appliedForKey = null;
  var appliedForVideo = null;
  var manualOverrideForVideo = null;
  var rateChangeListeners = /* @__PURE__ */ new WeakSet();
  var lastProgrammaticRateSet = 0;
  function getMatchKey() {
    return getVideoIdFromUrl() || window.location.href;
  }
  var PAGE_SYNC_CHANNEL = "TMY_PLAYBACK_RATE_SYNC";
  function setPlaybackRateInPage(playbackSpeed) {
    window.postMessage(
      { channel: PAGE_SYNC_CHANNEL, type: "setPlaybackRate", rate: playbackSpeed },
      "*"
    );
  }
  function getPlayerApis() {
    const apis = [];
    const moviePlayer = document.getElementById("movie_player");
    if (moviePlayer && typeof moviePlayer.setPlaybackRate === "function") {
      apis.push(moviePlayer);
    }
    const ytdPlayer = document.querySelector("ytd-player");
    if (ytdPlayer) {
      if (typeof ytdPlayer.getPlayer === "function") {
        const inner = ytdPlayer.getPlayer();
        if (inner && typeof inner.setPlaybackRate === "function") {
          apis.push(inner);
        }
      }
      const legacy = ytdPlayer.player_;
      if (legacy && typeof legacy.setPlaybackRate === "function") {
        apis.push(legacy);
      }
    }
    return apis;
  }
  function setVideoPlaybackRate(video, playbackSpeed) {
    if (video.playbackRate === playbackSpeed) return;
    lastProgrammaticRateSet = Date.now();
    video.playbackRate = playbackSpeed;
  }
  function registerRateChangeListener(video, targetRate) {
    if (rateChangeListeners.has(video)) return;
    rateChangeListeners.add(video);
    video.addEventListener("ratechange", () => {
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
  var syncIntervalId = null;
  var syncToken = 0;
  function syncPlaybackRateWithPlayer(playbackSpeed) {
    const maxAttempts = 30;
    const retryDelayMs = 350;
    const token = syncToken += 1;
    let attempts = 0;
    if (syncIntervalId) {
      window.clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
    const trySync = () => {
      if (token !== syncToken) return;
      attempts += 1;
      const video = document.querySelector("video");
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
        if (typeof api.setPlaybackRate !== "function") return;
        try {
          api.setPlaybackRate(playbackSpeed);
        } catch (err) {
        }
      });
      if (video && video.playbackRate !== playbackSpeed) {
        setVideoPlaybackRate(video, playbackSpeed);
      }
      if (attempts >= maxAttempts) {
        window.clearInterval(syncIntervalId);
        syncIntervalId = null;
      }
    };
    trySync();
    syncIntervalId = window.setInterval(trySync, retryDelayMs);
  }
  function applyPlaybackRateOnce(speed) {
    if (!speed) return false;
    const playbackSpeed = Number(speed);
    if (!Number.isFinite(playbackSpeed) || playbackSpeed <= 0) return false;
    let applied = false;
    const videos = Array.from(document.querySelectorAll("video"));
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
      video.addEventListener("loadedmetadata", onMetadata, { once: true });
      video.addEventListener(
        "playing",
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
  var pendingCheck = null;
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
      const currentVideo = document.querySelector("video");
      if (appliedForVideo && currentVideo && appliedForVideo === currentVideo && currentVideo.isConnected) {
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
    if (area !== "sync") return;
    if (changes.rules) {
      refreshSettings();
    }
  });
  window.addEventListener("yt-navigate-finish", () => {
    appliedForKey = null;
    appliedForVideo = null;
    manualOverrideForVideo = null;
    scheduleEvaluate();
  });
  var observer = new MutationObserver(() => {
    scheduleEvaluate();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  refreshSettings();
  var startupAttempts = 0;
  var startupInterval = window.setInterval(() => {
    scheduleEvaluate();
    startupAttempts += 1;
    if (startupAttempts >= 20) {
      window.clearInterval(startupInterval);
    }
  }, 500);
})();
