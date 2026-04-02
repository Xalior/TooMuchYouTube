# TooMuchYouTube 📺

<div align="center">
  <img src="docs/icon.png" width="420" alt="TooMuchYouTube icon">
  <p><em>Speed rules for the impatient.</em></p>
  <p><a href="https://github.com/Xalior/TooMuchYouTube">github.com/Xalior/TooMuchYouTube</a></p>
</div>

Make YouTube play at the speed you want, automatically. Set rules by channel, title, or video ID and let the extension handle the rest. 🧃

Version: 0.3.3 · Changelog: [docs/changelog.md](docs/changelog.md)

## Why speed things up? 🤹

- Tutorials that spend 90 seconds on "click the red button" 🐢
- Talk shows that could use a little less throat‑clearing 🎙️
- Podcast intros you have memorized word‑for‑word 🌀
- Product reviews with long cinematic pans of the box 📦
- Live streams where the interesting part is 10 minutes apart ⏳
- Lectures with slow pacing but good content 🧠
- Transcriptions, training, or video essays that deserve a slower pace 🐌

## What it does ✨

- Match by **channel**, **title contains**, or **video ID**.
- First matching rule wins (reorder to control priority).
- Applies the playback speed as soon as the video is ready.
- Keeps your manual change if you override the speed.

## How to use 🛠️

1. Open the extension popup.
2. Add a rule and set a speed (0.25x–4x).
3. Reorder rules if needed.
4. Save and enjoy the zoomies. 🚀

## Tech details

More on how the extension is wired is in `docs/architecture.md`.
For automation notes, see `AGENTS.md`.

Note: Shorts support is still mostly untested... this a measured combination of (1) a principled stand against vertical serotonin powered doom-scrolling, and (2) a deep understanding that no-one watches those things really, anyways... I’ll get to it, when Shorts get worth watching.  But, as it is, Shorts keep happening to us, not the other way around... 🙄📱 

## License

GPLv3. See `LICENSE`.
