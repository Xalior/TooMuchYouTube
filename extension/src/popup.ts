import { isYouTubeHost } from './domains';

type RuleType = 'channel' | 'title' | 'videoId';

type Rule = {
  id?: string;
  type: RuleType;
  value: string;
  speed: string;
};

type QuickAddData = {
  videoId: string;
  channelCandidates: string[];
  title: string;
};

const rulesBody = document.getElementById('rulesBody') as HTMLDivElement | null;
const status = document.getElementById('status') as HTMLSpanElement | null;
const addButton = document.getElementById('addRule') as HTMLButtonElement | null;
const quickAddChannel = document.getElementById('quickAddChannel') as HTMLButtonElement | null;
const quickAddVideo = document.getElementById('quickAddVideo') as HTMLButtonElement | null;
const newType = document.getElementById('newType') as HTMLSelectElement | null;
const newValue = document.getElementById('newValue') as HTMLInputElement | null;
const newSpeed = document.getElementById('newSpeed') as HTMLInputElement | null;
const debugInfo = document.getElementById('debugInfo') as HTMLSpanElement | null;
const aboutOpen = document.getElementById('aboutOpen') as HTMLButtonElement | null;
const aboutClose = document.getElementById('aboutClose') as HTMLButtonElement | null;
const aboutOpenBottom = document.getElementById('aboutOpenBottom') as HTMLButtonElement | null;
const aboutCloseBottom = document.getElementById('aboutCloseBottom') as HTMLButtonElement | null;
const aboutPanel = document.getElementById('aboutPanel') as HTMLDivElement | null;
const aboutBuildMode = document.getElementById('aboutBuildMode') as HTMLSpanElement | null;
const editor = document.getElementById('editor') as HTMLElement | null;
const notYoutube = document.getElementById('notYoutube') as HTMLElement | null;

if (
  !rulesBody ||
  !status ||
  !addButton ||
  !quickAddChannel ||
  !quickAddVideo ||
  !newType ||
  !newValue ||
  !newSpeed ||
  !debugInfo ||
  !aboutOpen ||
  !aboutClose ||
  !aboutOpenBottom ||
  !aboutCloseBottom ||
  !aboutPanel ||
  !aboutBuildMode ||
  !editor ||
  !notYoutube
) {
  console.warn('TooMuchYouTube popup: missing required elements.');
} else {
  const defaults = {
    rules: [] as Rule[]
  };

  const typeLabels: Record<RuleType, string> = {
    channel: 'Channel',
    title: 'Title',
    videoId: 'Video ID'
  };

  let rules: Rule[] = [];
  let dragIndex: number | null = null;
  let dragPlaceholder: HTMLDivElement | null = null;
  let dragSourceRow: HTMLDivElement | null = null;
  let dragPointerId: number | null = null;
  let saveTimer: number | null = null;
  let statusTimer: number | null = null;
  let lastEditorVisible = true;
  function isYouTubeUrl(url: string) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return isYouTubeHost(parsed.hostname);
    } catch (err) {
      return false;
    }
  }

  function getVideoIdFromUrl(url: string) {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'youtu.be') {
        return parsed.pathname.split('/')[1]?.split(/[?&#/]/)[0] || '';
      }
      const v = parsed.searchParams.get('v');
      if (v) return v;
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/shorts/')[1].split(/[?&#/]/)[0] || '';
      }
      return '';
    } catch (err) {
      return '';
    }
  }

  function pickChannelCandidate(candidates: string[]) {
    const cleaned = candidates.map((value) => value.trim()).filter(Boolean);
    const handle = cleaned.find((value) => value.startsWith('@'));
    if (handle) return handle;
    const channelId = cleaned.find((value) => /^UC[\w-]{10,}$/.test(value));
    if (channelId) return channelId;
    return cleaned[0] || '';
  }

  function getActiveTab() {
    return new Promise<chrome.tabs.Tab | null>((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs && tabs[0] ? tabs[0] : null);
      });
    });
  }

  function requestQuickAddData(tabId: number) {
    return new Promise<QuickAddData | null>((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: 'getQuickAddData' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve((response as QuickAddData) || null);
      });
    });
  }

  async function refreshQuickAddState() {
    const tab = await getActiveTab();
    if (!tab || !isYouTubeUrl(tab.url || tab.pendingUrl || '')) {
      quickAddChannel.disabled = true;
      quickAddVideo.disabled = true;
      return;
    }

    const data = tab.id ? await requestQuickAddData(tab.id) : null;
    const videoId = data?.videoId || getVideoIdFromUrl(tab.url || tab.pendingUrl || '');
    const channel = pickChannelCandidate(data?.channelCandidates || []);
    quickAddVideo.disabled = !videoId;
    quickAddChannel.disabled = !channel;
  }

  function setEditorVisible(isVisible: boolean) {
    lastEditorVisible = isVisible;
    editor.classList.toggle('hidden', !isVisible);
    notYoutube.classList.toggle('hidden', isVisible);
    document.body.classList.toggle('not-youtube', !isVisible);
  }

  function setAboutOpen(isOpen: boolean) {
    document.body.classList.toggle('about-open', isOpen);
    aboutPanel.classList.toggle('hidden', !isOpen);
    aboutOpen.classList.toggle('hidden', isOpen);
    aboutClose.classList.toggle('hidden', !isOpen);
    aboutOpenBottom.classList.toggle('hidden', isOpen);
    aboutCloseBottom.classList.toggle('hidden', !isOpen);
    if (isOpen) {
      editor.classList.remove('hidden');
      notYoutube.classList.add('hidden');
    } else {
      setEditorVisible(lastEditorVisible);
    }
  }

  function refreshActiveTabState() {
    if (!chrome.tabs?.query) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0] ? tabs[0] : null;
      const url = tab?.url || tab?.pendingUrl || '';
      setEditorVisible(isYouTubeUrl(url));
    });
  }

  function showStatus(message: string, tone: 'success' | 'error' | 'warning' = 'success') {
    status.textContent = message;
    status.classList.remove('success', 'error', 'warning');
    if (message) {
      status.classList.add('show', tone);
    } else {
      status.classList.remove('show');
    }
    if (!message) return;
    if (statusTimer) {
      window.clearTimeout(statusTimer);
    }
    statusTimer = window.setTimeout(() => {
      status.textContent = '';
      status.classList.remove('show');
    }, 1500);
  }

  function renderDebugBar() {
    const isDebug = __BUILD_MODE__ === 'debug';
    document.body.classList.toggle('is-debug', isDebug);
    debugInfo.classList.toggle('hidden', !isDebug);
    const bottomBar = document.querySelector('.bottom-bar');
    if (bottomBar instanceof HTMLElement) {
      bottomBar.classList.toggle('no-debug', !isDebug);
    }
    if (!isDebug) return;
    debugInfo.textContent = `DEBUG ${__BUILD_GIT_HASH__}.${__BUILD_TIME__}`;
  }

  function renderAboutInfo() {
    aboutBuildMode.textContent = __BUILD_MODE__;
  }

  function saveRules(showToast: boolean) {
    const normalized = normalizeRules(rules);
    chrome.storage.sync.set({ rules: normalized }, () => {
      rules = normalized;
      renderRules();
      if (showToast) {
        showStatus('Saved', 'success');
      }
    });
  }

  function scheduleSave(showToast = true) {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      saveRules(showToast);
    }, 500);
  }

  function renderRules() {
    rulesBody.innerHTML = '';

    if (rules.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'No rules yet. Add one below.';
      rulesBody.appendChild(empty);
      return;
    }

    rules.forEach((rule, index) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.index = String(index);

      const orderCell = document.createElement('div');
      orderCell.className = 'order';

      const indexEl = document.createElement('span');
      indexEl.className = 'index';
      indexEl.textContent = String(index + 1);

      const dragHandle = document.createElement('button');
      dragHandle.type = 'button';
      dragHandle.className = 'icon-btn small drag-handle';
      dragHandle.textContent = '\u2261';
      dragHandle.title = 'Drag to reorder';
      dragHandle.draggable = false;

      orderCell.append(indexEl, dragHandle);

      const typeSelect = document.createElement('select');
      typeSelect.dataset.field = 'type';
      (['channel', 'videoId', 'title'] as RuleType[]).forEach((type) => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = typeLabels[type];
        if (rule.type === type) option.selected = true;
        typeSelect.appendChild(option);
      });

      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.value = rule.value;
      valueInput.placeholder = 'Match text';
      valueInput.dataset.field = 'value';

      const speedInput = document.createElement('input');
      speedInput.type = 'number';
      speedInput.min = '0.25';
      speedInput.max = '4';
      speedInput.step = '0.25';
      speedInput.value = rule.speed;
      speedInput.placeholder = '1.5';
      speedInput.dataset.field = 'speed';

      const actions = document.createElement('div');
      actions.className = 'actions-inline';

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'icon-btn danger';
      deleteButton.textContent = 'Delete';
      deleteButton.dataset.action = 'delete';

      actions.append(deleteButton);

      row.append(orderCell, typeSelect, valueInput, speedInput, actions);
      rulesBody.appendChild(row);
    });
  }

  function normalizeRules(list: Rule[]) {
    return list
      .map((rule) => ({
        id: rule.id || crypto.randomUUID(),
        type: rule.type,
        value: String(rule.value || '').trim(),
        speed: String(rule.speed || '').trim()
      }))
      .filter((rule) => rule.value && rule.speed);
  }

  function moveRule(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= rules.length) return;
    const updated = [...rules];
    const [item] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, item);
    rules = updated;
    renderRules();
    scheduleSave();
  }

  function deleteRule(index: number) {
    rules = rules.filter((_, idx) => idx !== index);
    renderRules();
    scheduleSave(false);
    showStatus('Deleted', 'error');
  }

  function updateRule(index: number, field: string, value: string) {
    rules = rules.map((rule, idx) => {
      if (idx !== index) return rule;
      return { ...rule, [field]: value } as Rule;
    });
    scheduleSave();
  }

  rulesBody.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const row = target.closest('.row');
    if (!(row instanceof HTMLElement)) return;
    const index = Number(row.dataset.index);

    if (target.dataset.action === 'delete') {
      deleteRule(index);
    }
  });

  function isInteractiveTarget(target: HTMLElement) {
    const handle = target.closest('.drag-handle');
    if (handle) return false;
    return Boolean(target.closest('input, select, textarea, button'));
  }

  function beginDrag(row: HTMLDivElement, pointerId: number) {
    dragIndex = Number(row.dataset.index);
    dragPointerId = pointerId;
    dragSourceRow = row;
    dragPlaceholder = dragSourceRow.cloneNode(true) as HTMLDivElement;
    dragPlaceholder.classList.add('drag-placeholder');
    dragPlaceholder.removeAttribute('data-index');
    dragPlaceholder.setAttribute('aria-hidden', 'true');

    dragSourceRow.style.display = 'none';
    rulesBody.insertBefore(dragPlaceholder, dragSourceRow);
    document.body.classList.add('no-select');
  }

  function updatePlaceholder(clientX: number, clientY: number) {
    if (!dragPlaceholder) return;
    const rows = Array.from(rulesBody.querySelectorAll('.row')).filter(
      (row) => row !== dragPlaceholder && row !== dragSourceRow
    ) as HTMLElement[];
    if (rows.length === 0) {
      rulesBody.appendChild(dragPlaceholder);
      return;
    }

    const targetRow = rows.find((row) => {
      const rect = row.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });
    if (targetRow) {
      targetRow.insertAdjacentElement('beforebegin', dragPlaceholder);
    } else {
      rows[rows.length - 1].insertAdjacentElement('afterend', dragPlaceholder);
    }
  }

  function autoScrollList(clientY: number) {
    const rect = rulesBody.getBoundingClientRect();
    const edge = 24;
    const maxSpeed = 12;
    if (clientY < rect.top + edge) {
      const distance = Math.max(0, rect.top + edge - clientY);
      rulesBody.scrollTop -= Math.min(maxSpeed, distance);
      return;
    }
    if (clientY > rect.bottom - edge) {
      const distance = Math.max(0, clientY - (rect.bottom - edge));
      rulesBody.scrollTop += Math.min(maxSpeed, distance);
    }
  }

  function finalizeDrag() {
    if (dragIndex === null) return;
    if (dragPlaceholder) {
      const ordered = Array.from(rulesBody.children) as HTMLElement[];
      let toIndex = 0;
      for (const child of ordered) {
        if (child === dragPlaceholder) break;
        if (
          child.classList.contains('row') &&
          child !== dragSourceRow &&
          child !== dragPlaceholder
        ) {
          toIndex += 1;
        }
      }
      if (dragIndex !== toIndex) {
        moveRule(dragIndex, toIndex);
      }
    }
    cleanupDrag();
  }

  function cleanupDrag() {
    if (dragPlaceholder && dragPlaceholder.parentElement) {
      dragPlaceholder.parentElement.removeChild(dragPlaceholder);
    }
    if (dragSourceRow) {
      dragSourceRow.style.display = '';
    }
    dragIndex = null;
    dragPlaceholder = null;
    dragSourceRow = null;
    dragPointerId = null;
    document.body.classList.remove('no-select');
  }

  rulesBody.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (isInteractiveTarget(target)) return;
    const row = target.closest('.row');
    if (!(row instanceof HTMLDivElement)) return;
    beginDrag(row, event.pointerId);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  });

  rulesBody.addEventListener('pointermove', (event) => {
    if (dragPointerId === null || event.pointerId !== dragPointerId) return;
    autoScrollList(event.clientY);
    updatePlaceholder(event.clientX, event.clientY);
  });

  rulesBody.addEventListener('pointerup', (event) => {
    if (dragPointerId === null || event.pointerId !== dragPointerId) return;
    finalizeDrag();
  });

  rulesBody.addEventListener('pointercancel', (event) => {
    if (dragPointerId === null || event.pointerId !== dragPointerId) return;
    cleanupDrag();
  });

  rulesBody.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }

    const row = target.closest('.row');
    if (!(row instanceof HTMLElement)) return;
    const index = Number(row.dataset.index);
    const field = target.dataset.field;
    if (!field) return;

    updateRule(index, field, target.value);
  });

  addButton.addEventListener('click', () => {
    const value = newValue.value.trim();
    const speed = newSpeed.value.trim();
    if (!value || !speed) {
      showStatus('Add a match and speed', 'warning');
      return;
    }

    rules = [
      ...rules,
      {
        id: crypto.randomUUID(),
        type: newType.value as RuleType,
        value,
        speed
      }
    ];

    newValue.value = '';
    newSpeed.value = '';
    renderRules();
    scheduleSave();
  });

  aboutOpen.addEventListener('click', () => {
    setAboutOpen(true);
  });

  aboutClose.addEventListener('click', () => {
    setAboutOpen(false);
  });

  aboutOpenBottom.addEventListener('click', () => {
    setAboutOpen(true);
  });

  aboutCloseBottom.addEventListener('click', () => {
    setAboutOpen(false);
  });

  quickAddChannel.addEventListener('click', async () => {
    const tab = await getActiveTab();
    const tabUrl = tab?.url || tab?.pendingUrl || '';
    if (!tab || !isYouTubeUrl(tabUrl)) {
      showStatus('Open a YouTube tab', 'warning');
      return;
    }
    const data = tab.id ? await requestQuickAddData(tab.id) : null;
    const channel = pickChannelCandidate(data?.channelCandidates || []);
    if (!channel) {
      showStatus('Channel not found', 'error');
      return;
    }
    newType.value = 'channel';
    newValue.value = channel;
    newSpeed.focus();
    newSpeed.select();
  });

  quickAddVideo.addEventListener('click', async () => {
    const tab = await getActiveTab();
    const tabUrl = tab?.url || tab?.pendingUrl || '';
    if (!tab || !isYouTubeUrl(tabUrl)) {
      showStatus('Open a YouTube tab', 'warning');
      return;
    }
    const data = tab.id ? await requestQuickAddData(tab.id) : null;
    const videoId = data?.videoId || getVideoIdFromUrl(tabUrl);
    if (!videoId) {
      showStatus('Video ID not found', 'error');
      return;
    }
    newType.value = 'videoId';
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
    renderAboutInfo();
    setAboutOpen(false);
  });

  refreshActiveTabState();
  refreshQuickAddState();
}
