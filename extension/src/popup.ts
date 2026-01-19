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
  let dragGhost: HTMLDivElement | null = null;
  let saveTimer: number | null = null;
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
    editor.classList.toggle('hidden', !isVisible);
    notYoutube.classList.toggle('hidden', isVisible);
  }

  function refreshActiveTabState() {
    if (!chrome.tabs?.query) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0] ? tabs[0] : null;
      const url = tab?.url || tab?.pendingUrl || '';
      setEditorVisible(isYouTubeUrl(url));
    });
  }

  function showStatus(message: string) {
    status.textContent = message;
    if (!message) return;
    setTimeout(() => {
      status.textContent = '';
    }, 1500);
  }

  function renderDebugBar() {
    if (__BUILD_MODE__ !== 'debug') return;
    document.body.classList.add('debug-mode');
    const bar = document.createElement('div');
    bar.className = 'debug-bar';
    bar.textContent = `DEBUG ${__BUILD_GIT_HASH__}.${__BUILD_TIME__}`;
    document.body.appendChild(bar);
  }

  function saveRules() {
    const normalized = normalizeRules(rules);
    chrome.storage.sync.set({ rules: normalized }, () => {
      rules = normalized;
      renderRules();
      showStatus('Saved');
    });
  }

  function scheduleSave() {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      saveRules();
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

      row.setAttribute('draggable', 'true');
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
    scheduleSave();
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

  rulesBody.addEventListener('dragstart', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.closest('.drag-handle')) return;

    const row = target.closest('.row');
    if (!(row instanceof HTMLElement)) return;
    dragIndex = Number(row.dataset.index);
    row.classList.add('dragging');
    dragSourceRow = row as HTMLDivElement;
    dragPlaceholder = document.createElement('div');
    dragPlaceholder.className = 'row placeholder';
    dragPlaceholder.setAttribute('aria-hidden', 'true');
    dragGhost = row.cloneNode(true) as HTMLDivElement;
    dragGhost.classList.remove('dragging');
    dragGhost.classList.add('ghost');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(dragIndex));
      event.dataTransfer.setDragImage(row, 12, 12);
    }
    if (dragSourceRow && dragGhost && dragSourceRow.isConnected) {
      const rowRect = dragSourceRow.getBoundingClientRect();
      const bodyRect = rulesBody.getBoundingClientRect();
      dragGhost.style.position = 'absolute';
      dragGhost.style.top = `${rowRect.top - bodyRect.top}px`;
      dragGhost.style.left = `${rowRect.left - bodyRect.left}px`;
      dragGhost.style.width = `${rowRect.width}px`;
      dragGhost.style.height = `${rowRect.height}px`;
      dragSourceRow.style.display = 'none';
      rulesBody.appendChild(dragGhost);
      rulesBody.insertBefore(dragPlaceholder, dragSourceRow);
    }
  });

  rulesBody.addEventListener('dragend', () => {
    dragIndex = null;
    document.querySelectorAll('.row.dragging, .row.drag-over').forEach((row) => {
      row.classList.remove('dragging', 'drag-over');
    });
    if (dragPlaceholder && dragPlaceholder.parentElement) {
      dragPlaceholder.parentElement.removeChild(dragPlaceholder);
    }
    dragPlaceholder = null;
    if (dragGhost && dragGhost.parentElement) {
      dragGhost.parentElement.removeChild(dragGhost);
    }
    if (dragSourceRow) {
      dragSourceRow.style.display = '';
    }
    dragSourceRow = null;
    dragGhost = null;
  });

  rulesBody.addEventListener('dragover', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const row = target.closest('.row');
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    if (!dragPlaceholder) return;
    if (!row || row.classList.contains('dragging') || row === dragPlaceholder) {
      if (!row) {
        rulesBody.appendChild(dragPlaceholder);
      }
      return;
    }

    const rect = row.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    if (after) {
      row.insertAdjacentElement('afterend', dragPlaceholder);
    } else {
      row.insertAdjacentElement('beforebegin', dragPlaceholder);
    }
  });

  rulesBody.addEventListener('dragleave', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const row = target.closest('.row');
    if (!(row instanceof HTMLElement)) return;
    row.classList.remove('drag-over');
  });

  rulesBody.addEventListener('drop', (event) => {
    event.preventDefault();
    if (dragIndex === null || !dragPlaceholder) return;
    const ordered = Array.from(rulesBody.children) as HTMLElement[];
    let toIndex = 0;
    for (const child of ordered) {
      if (child === dragPlaceholder) break;
      if (child.classList.contains('row') && !child.classList.contains('dragging')) {
        toIndex += 1;
      }
    }
    if (dragIndex !== toIndex) {
      moveRule(dragIndex, toIndex);
    }
    if (dragPlaceholder.parentElement) {
      dragPlaceholder.parentElement.removeChild(dragPlaceholder);
    }
    dragPlaceholder = null;
    dragIndex = null;
    if (dragGhost && dragGhost.parentElement) {
      dragGhost.parentElement.removeChild(dragGhost);
    }
    if (dragSourceRow) {
      dragSourceRow.style.display = '';
    }
    dragSourceRow = null;
    dragGhost = null;
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
      showStatus('Add a match and speed');
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

  quickAddChannel.addEventListener('click', async () => {
    const tab = await getActiveTab();
    const tabUrl = tab?.url || tab?.pendingUrl || '';
    if (!tab || !isYouTubeUrl(tabUrl)) {
      showStatus('Open a YouTube tab');
      return;
    }
    const data = tab.id ? await requestQuickAddData(tab.id) : null;
    const channel = pickChannelCandidate(data?.channelCandidates || []);
    if (!channel) {
      showStatus('Channel not found');
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
      showStatus('Open a YouTube tab');
      return;
    }
    const data = tab.id ? await requestQuickAddData(tab.id) : null;
    const videoId = data?.videoId || getVideoIdFromUrl(tabUrl);
    if (!videoId) {
      showStatus('Video ID not found');
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
  });

  refreshActiveTabState();
  refreshQuickAddState();
}
