const fields = {
  channels: document.getElementById("channels"),
  videoIds: document.getElementById("videoIds"),
  titles: document.getElementById("titles"),
  speed: document.getElementById("speed")
};
const status = document.getElementById("status");
const saveButton = document.getElementById("save");

const defaults = {
  channelMatches: "",
  videoIdMatches: "",
  titleMatches: "",
  playbackSpeed: ""
};

function showStatus(message) {
  status.textContent = message;
  if (!message) return;
  setTimeout(() => {
    status.textContent = "";
  }, 1500);
}

chrome.storage.sync.get(defaults, (data) => {
  fields.channels.value = data.channelMatches || "";
  fields.videoIds.value = data.videoIdMatches || "";
  fields.titles.value = data.titleMatches || "";
  fields.speed.value = data.playbackSpeed || "";
});

saveButton.addEventListener("click", () => {
  const playbackSpeed = fields.speed.value.trim();
  chrome.storage.sync.set(
    {
      channelMatches: fields.channels.value,
      videoIdMatches: fields.videoIds.value,
      titleMatches: fields.titles.value,
      playbackSpeed
    },
    () => {
      showStatus("Saved");
    }
  );
});
