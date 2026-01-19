const rulesBody = document.getElementById("rulesBody");
const status = document.getElementById("status");
const saveButton = document.getElementById("save");
const addButton = document.getElementById("addRule");
const newType = document.getElementById("newType");
const newValue = document.getElementById("newValue");
const newSpeed = document.getElementById("newSpeed");
const editor = document.getElementById("editor");
const notYoutube = document.getElementById("notYoutube");

const defaults = {
  rules: []
};

const typeLabels = {
  channel: "Channel",
  title: "Title",
  videoId: "Video ID"
};

let rules = [];

function isYouTubeUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "youtu.be" ||
      parsed.hostname.endsWith("youtube.com")
    );
  } catch (err) {
    return false;
  }
}

function setEditorVisible(isVisible) {
  if (!editor || !notYoutube) return;
  editor.classList.toggle("hidden", !isVisible);
  notYoutube.classList.toggle("hidden", isVisible);
}

function refreshActiveTabState() {
  if (!chrome.tabs?.query) return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0] ? tabs[0] : null;
    const url = tab?.url || tab?.pendingUrl || "";
    setEditorVisible(isYouTubeUrl(url));
  });
}

function showStatus(message) {
  status.textContent = message;
  if (!message) return;
  setTimeout(() => {
    status.textContent = "";
  }, 1500);
}

function renderRules() {
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

    const upButton = document.createElement("button");
    upButton.type = "button";
    upButton.className = "icon-btn small";
    upButton.textContent = "▲";
    upButton.dataset.action = "up";
    upButton.disabled = index === 0;

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.className = "icon-btn small";
    downButton.textContent = "▼";
    downButton.dataset.action = "down";
    downButton.disabled = index === rules.length - 1;

    orderCell.append(indexEl, upButton, downButton);

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
    deleteButton.className = "icon-btn";
    deleteButton.textContent = "Delete";
    deleteButton.dataset.action = "delete";

    actions.append(deleteButton);

    row.append(orderCell, typeSelect, valueInput, speedInput, actions);
    rulesBody.appendChild(row);
  });
}

function normalizeRules(list) {
  return list
    .map((rule) => ({
      id: rule.id || crypto.randomUUID(),
      type: rule.type,
      value: rule.value.trim(),
      speed: rule.speed.trim()
    }))
    .filter((rule) => rule.value && rule.speed);
}

function moveRule(fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= rules.length) return;
  const updated = [...rules];
  const [item] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, item);
  rules = updated;
  renderRules();
}

function deleteRule(index) {
  rules = rules.filter((_, idx) => idx !== index);
  renderRules();
}

function updateRule(index, field, value) {
  rules = rules.map((rule, idx) => {
    if (idx !== index) return rule;
    return { ...rule, [field]: value };
  });
}

rulesBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const row = target.closest(".row");
  if (!row) return;
  const index = Number(row.dataset.index);

  if (target.dataset.action === "up") {
    moveRule(index, index - 1);
  }

  if (target.dataset.action === "down") {
    moveRule(index, index + 1);
  }

  if (target.dataset.action === "delete") {
    deleteRule(index);
  }
});

rulesBody.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

  const row = target.closest(".row");
  if (!row) return;
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
});

saveButton.addEventListener("click", () => {
  const normalized = normalizeRules(rules);
  chrome.storage.sync.set({ rules: normalized }, () => {
    rules = normalized;
    renderRules();
    showStatus("Saved");
  });
});

chrome.storage.sync.get(defaults, (data) => {
  rules = data.rules || [];
  renderRules();
});

refreshActiveTabState();
