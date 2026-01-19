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

  // extension/src/popup.ts
  var rulesBody = document.getElementById("rulesBody");
  var status = document.getElementById("status");
  var addButton = document.getElementById("addRule");
  var quickAddChannel = document.getElementById("quickAddChannel");
  var quickAddVideo = document.getElementById("quickAddVideo");
  var newType = document.getElementById("newType");
  var newValue = document.getElementById("newValue");
  var newSpeed = document.getElementById("newSpeed");
  var debugInfo = document.getElementById("debugInfo");
  var editor = document.getElementById("editor");
  var notYoutube = document.getElementById("notYoutube");
  if (!rulesBody || !status || !addButton || !quickAddChannel || !quickAddVideo || !newType || !newValue || !newSpeed || !debugInfo || !editor || !notYoutube) {
    console.warn("TooMuchYouTube popup: missing required elements.");
  } else {
    let isYouTubeUrl = function(url) {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        return isYouTubeHost(parsed.hostname);
      } catch (err) {
        return false;
      }
    }, getVideoIdFromUrl = function(url) {
      if (!url) return "";
      try {
        const parsed = new URL(url);
        if (parsed.hostname === "youtu.be") {
          return parsed.pathname.split("/")[1]?.split(/[?&#/]/)[0] || "";
        }
        const v = parsed.searchParams.get("v");
        if (v) return v;
        if (parsed.pathname.startsWith("/shorts/")) {
          return parsed.pathname.split("/shorts/")[1].split(/[?&#/]/)[0] || "";
        }
        return "";
      } catch (err) {
        return "";
      }
    }, pickChannelCandidate = function(candidates) {
      const cleaned = candidates.map((value) => value.trim()).filter(Boolean);
      const handle = cleaned.find((value) => value.startsWith("@"));
      if (handle) return handle;
      const channelId = cleaned.find((value) => /^UC[\w-]{10,}$/.test(value));
      if (channelId) return channelId;
      return cleaned[0] || "";
    }, getActiveTab = function() {
      return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          resolve(tabs && tabs[0] ? tabs[0] : null);
        });
      });
    }, requestQuickAddData = function(tabId) {
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: "getQuickAddData" }, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(response || null);
        });
      });
    }, setEditorVisible = function(isVisible) {
      editor.classList.toggle("hidden", !isVisible);
      notYoutube.classList.toggle("hidden", isVisible);
      document.body.classList.toggle("not-youtube", !isVisible);
    }, refreshActiveTabState = function() {
      if (!chrome.tabs?.query) return;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs && tabs[0] ? tabs[0] : null;
        const url = tab?.url || tab?.pendingUrl || "";
        setEditorVisible(isYouTubeUrl(url));
      });
    }, showStatus = function(message) {
      status.textContent = message;
      if (!message) return;
      setTimeout(() => {
        status.textContent = "";
      }, 1500);
    }, renderDebugBar = function() {
      if (false) return;
      debugInfo.textContent = `DEBUG ${"d19223c"}.${"233614"}`;
      debugInfo.classList.remove("hidden");
    }, saveRules = function() {
      const normalized = normalizeRules(rules);
      chrome.storage.sync.set({ rules: normalized }, () => {
        rules = normalized;
        renderRules();
        showStatus("Saved");
      });
    }, scheduleSave = function() {
      if (saveTimer) {
        window.clearTimeout(saveTimer);
      }
      saveTimer = window.setTimeout(() => {
        saveTimer = null;
        saveRules();
      }, 500);
    }, renderRules = function() {
      rulesBody.innerHTML = "";
      if (rules.length === 0) {
        const empty = document.createElement("div");
        empty.className = "hint";
        empty.textContent = "No rules yet. Add one below.";
        rulesBody.appendChild(empty);
        return;
      }
      rules.forEach((rule, index) => {
        const row = document.createElement("div");
        row.className = "row";
        row.dataset.index = String(index);
        const orderCell = document.createElement("div");
        orderCell.className = "order";
        const indexEl = document.createElement("span");
        indexEl.className = "index";
        indexEl.textContent = String(index + 1);
        const dragHandle = document.createElement("button");
        dragHandle.type = "button";
        dragHandle.className = "icon-btn small drag-handle";
        dragHandle.textContent = "\u2261";
        dragHandle.title = "Drag to reorder";
        dragHandle.draggable = false;
        orderCell.append(indexEl, dragHandle);
        const typeSelect = document.createElement("select");
        typeSelect.dataset.field = "type";
        ["channel", "videoId", "title"].forEach((type) => {
          const option = document.createElement("option");
          option.value = type;
          option.textContent = typeLabels[type];
          if (rule.type === type) option.selected = true;
          typeSelect.appendChild(option);
        });
        const valueInput = document.createElement("input");
        valueInput.type = "text";
        valueInput.value = rule.value;
        valueInput.placeholder = "Match text";
        valueInput.dataset.field = "value";
        const speedInput = document.createElement("input");
        speedInput.type = "number";
        speedInput.min = "0.25";
        speedInput.max = "4";
        speedInput.step = "0.25";
        speedInput.value = rule.speed;
        speedInput.placeholder = "1.5";
        speedInput.dataset.field = "speed";
        const actions = document.createElement("div");
        actions.className = "actions-inline";
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "icon-btn danger";
        deleteButton.textContent = "Delete";
        deleteButton.dataset.action = "delete";
        actions.append(deleteButton);
        row.append(orderCell, typeSelect, valueInput, speedInput, actions);
        rulesBody.appendChild(row);
      });
    }, normalizeRules = function(list) {
      return list.map((rule) => ({
        id: rule.id || crypto.randomUUID(),
        type: rule.type,
        value: String(rule.value || "").trim(),
        speed: String(rule.speed || "").trim()
      })).filter((rule) => rule.value && rule.speed);
    }, moveRule = function(fromIndex, toIndex) {
      if (toIndex < 0 || toIndex >= rules.length) return;
      const updated = [...rules];
      const [item] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, item);
      rules = updated;
      renderRules();
      scheduleSave();
    }, deleteRule = function(index) {
      rules = rules.filter((_, idx) => idx !== index);
      renderRules();
      scheduleSave();
    }, updateRule = function(index, field, value) {
      rules = rules.map((rule, idx) => {
        if (idx !== index) return rule;
        return { ...rule, [field]: value };
      });
      scheduleSave();
    }, isInteractiveTarget = function(target) {
      const handle = target.closest(".drag-handle");
      if (handle) return false;
      return Boolean(target.closest("input, select, textarea, button"));
    }, beginDrag = function(row, pointerId) {
      dragIndex = Number(row.dataset.index);
      dragPointerId = pointerId;
      dragSourceRow = row;
      dragPlaceholder = dragSourceRow.cloneNode(true);
      dragPlaceholder.classList.add("drag-placeholder");
      dragPlaceholder.removeAttribute("data-index");
      dragPlaceholder.setAttribute("aria-hidden", "true");
      dragSourceRow.style.display = "none";
      rulesBody.insertBefore(dragPlaceholder, dragSourceRow);
      document.body.classList.add("no-select");
    }, updatePlaceholder = function(clientX, clientY) {
      if (!dragPlaceholder) return;
      const rows = Array.from(rulesBody.querySelectorAll(".row")).filter(
        (row) => row !== dragPlaceholder && row !== dragSourceRow
      );
      if (rows.length === 0) {
        rulesBody.appendChild(dragPlaceholder);
        return;
      }
      const targetRow = rows.find((row) => {
        const rect = row.getBoundingClientRect();
        return clientY < rect.top + rect.height / 2;
      });
      if (targetRow) {
        targetRow.insertAdjacentElement("beforebegin", dragPlaceholder);
      } else {
        rows[rows.length - 1].insertAdjacentElement("afterend", dragPlaceholder);
      }
    }, finalizeDrag = function() {
      if (dragIndex === null) return;
      if (dragPlaceholder) {
        const ordered = Array.from(rulesBody.children);
        let toIndex = 0;
        for (const child of ordered) {
          if (child === dragPlaceholder) break;
          if (child.classList.contains("row") && child !== dragSourceRow && child !== dragPlaceholder) {
            toIndex += 1;
          }
        }
        if (dragIndex !== toIndex) {
          moveRule(dragIndex, toIndex);
        }
      }
      cleanupDrag();
    }, cleanupDrag = function() {
      if (dragPlaceholder && dragPlaceholder.parentElement) {
        dragPlaceholder.parentElement.removeChild(dragPlaceholder);
      }
      if (dragSourceRow) {
        dragSourceRow.style.display = "";
      }
      dragIndex = null;
      dragPlaceholder = null;
      dragSourceRow = null;
      dragPointerId = null;
      document.body.classList.remove("no-select");
    };
    const defaults = {
      rules: []
    };
    const typeLabels = {
      channel: "Channel",
      title: "Title",
      videoId: "Video ID"
    };
    let rules = [];
    let dragIndex = null;
    let dragPlaceholder = null;
    let dragSourceRow = null;
    let dragPointerId = null;
    let saveTimer = null;
    async function refreshQuickAddState() {
      const tab = await getActiveTab();
      if (!tab || !isYouTubeUrl(tab.url || tab.pendingUrl || "")) {
        quickAddChannel.disabled = true;
        quickAddVideo.disabled = true;
        return;
      }
      const data = tab.id ? await requestQuickAddData(tab.id) : null;
      const videoId = data?.videoId || getVideoIdFromUrl(tab.url || tab.pendingUrl || "");
      const channel = pickChannelCandidate(data?.channelCandidates || []);
      quickAddVideo.disabled = !videoId;
      quickAddChannel.disabled = !channel;
    }
    rulesBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const row = target.closest(".row");
      if (!(row instanceof HTMLElement)) return;
      const index = Number(row.dataset.index);
      if (target.dataset.action === "delete") {
        deleteRule(index);
      }
    });
    rulesBody.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (isInteractiveTarget(target)) return;
      const row = target.closest(".row");
      if (!(row instanceof HTMLDivElement)) return;
      beginDrag(row, event.pointerId);
      event.target.setPointerCapture(event.pointerId);
    });
    rulesBody.addEventListener("pointermove", (event) => {
      if (dragPointerId === null || event.pointerId !== dragPointerId) return;
      updatePlaceholder(event.clientX, event.clientY);
    });
    rulesBody.addEventListener("pointerup", (event) => {
      if (dragPointerId === null || event.pointerId !== dragPointerId) return;
      finalizeDrag();
    });
    rulesBody.addEventListener("pointercancel", (event) => {
      if (dragPointerId === null || event.pointerId !== dragPointerId) return;
      cleanupDrag();
    });
    rulesBody.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
        return;
      }
      const row = target.closest(".row");
      if (!(row instanceof HTMLElement)) return;
      const index = Number(row.dataset.index);
      const field = target.dataset.field;
      if (!field) return;
      updateRule(index, field, target.value);
    });
    addButton.addEventListener("click", () => {
      const value = newValue.value.trim();
      const speed = newSpeed.value.trim();
      if (!value || !speed) {
        showStatus("Add a match and speed");
        return;
      }
      rules = [
        ...rules,
        {
          id: crypto.randomUUID(),
          type: newType.value,
          value,
          speed
        }
      ];
      newValue.value = "";
      newSpeed.value = "";
      renderRules();
      scheduleSave();
    });
    quickAddChannel.addEventListener("click", async () => {
      const tab = await getActiveTab();
      const tabUrl = tab?.url || tab?.pendingUrl || "";
      if (!tab || !isYouTubeUrl(tabUrl)) {
        showStatus("Open a YouTube tab");
        return;
      }
      const data = tab.id ? await requestQuickAddData(tab.id) : null;
      const channel = pickChannelCandidate(data?.channelCandidates || []);
      if (!channel) {
        showStatus("Channel not found");
        return;
      }
      newType.value = "channel";
      newValue.value = channel;
      newSpeed.focus();
      newSpeed.select();
    });
    quickAddVideo.addEventListener("click", async () => {
      const tab = await getActiveTab();
      const tabUrl = tab?.url || tab?.pendingUrl || "";
      if (!tab || !isYouTubeUrl(tabUrl)) {
        showStatus("Open a YouTube tab");
        return;
      }
      const data = tab.id ? await requestQuickAddData(tab.id) : null;
      const videoId = data?.videoId || getVideoIdFromUrl(tabUrl);
      if (!videoId) {
        showStatus("Video ID not found");
        return;
      }
      newType.value = "videoId";
      newValue.value = videoId;
      newSpeed.focus();
      newSpeed.select();
    });
    chrome.storage.sync.get(defaults, (data) => {
      rules = data.rules || [];
      renderRules();
      refreshActiveTabState();
      refreshQuickAddState();
      renderDebugBar();
    });
    refreshActiveTabState();
    refreshQuickAddState();
  }
})();
