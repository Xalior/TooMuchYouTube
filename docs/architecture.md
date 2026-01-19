# Architecture

TooMuchYouTube is a Manifest V3 browser extension that applies playback-rate rules on YouTube pages.

## Components

- `extension/manifest.json`
  - Registers the popup UI and two content scripts.
  - Loads `page-bridge.js` in the MAIN world and `content.js` in the extension world.
- `extension/page-bridge.js`
  - Runs in the page context and can call YouTube player APIs directly.
  - Listens for `postMessage` events from the content script.
- `extension/content.js`
  - Reads rules from `chrome.storage.sync`.
  - Matches rules against the current channel/title/video ID.
  - Applies playback speed to the `<video>` element and syncs with player APIs.
- `extension/popup.html`, `extension/popup.js`, `extension/popup.css`
  - UI for creating, ordering, and saving rules.

## Data model

Rules are stored in `chrome.storage.sync` with this shape:

```json
{
  "rules": [
    {
      "id": "uuid",
      "type": "channel|title|videoId",
      "value": "match text",
      "speed": "1.5"
    }
  ]
}
```

## Matching logic

1. Extract the current **video ID** from `?v=` or `/shorts/`.
2. Collect **channel candidates** from page DOM and metadata.
3. Read the **title** from the header or document title.
4. Iterate rules in order and apply the first match.

Matching rules:

- `channel`: case‑insensitive substring match against collected channel names/handles.
- `title`: case‑insensitive substring match against the title.
- `videoId`: exact match against the ID.

## Playback rate application

- The content script attempts to set `video.playbackRate` directly.
- It also syncs via YouTube player APIs using a short retry loop (helps when the player swaps elements).
- `page-bridge.js` receives `postMessage` events to call APIs in the page world.
- If the user manually changes the playback rate, the extension stops reapplying the rule for that video.

## Lifecycle

- Rules load on startup and on `chrome.storage` changes.
- Navigation on YouTube triggers a re‑evaluation (`yt-navigate-finish`).
- A `MutationObserver` and a short startup interval catch late‑loading elements.
