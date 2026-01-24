# TODO

## Firefox support
- Replace MV3 `content_scripts` `"world": "MAIN"` usage with a page-bridge injection from `content.ts` (create a `<script>` tag that loads `dist/page-bridge.js` via `chrome.runtime.getURL()`).
- Add `web_accessible_resources` for `dist/page-bridge.js` in `extension/manifest.json`.
- Decide on a manifest strategy: single manifest (cross-browser) vs dual manifests (Chrome MV3 + Firefox MV3).
- Add `browser_specific_settings` (Gecko ID) for AMO packaging/signing.
- Verify `chrome.*` callback APIs are acceptable for Firefox, or add `webextension-polyfill` and move to `browser.*` if desired.
