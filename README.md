# PixelBeat

A free, open-source desktop music player that imports YouTube Music playlists and features an animated pixel pet that dances to the beat in real time.

## Features

- Import YouTube Music playlists by URL
- Stream audio directly (no downloads)
- Real-time beat detection via Web Audio API
- Animated pixel cat that reacts to bass, mids, and highs
- Segmented pixel-art UI with retro theme
- System tray integration with playback controls
- Persists playlists, settings, and window position between sessions

## Tech Stack

- **Electron** + **Vue 3** + **TypeScript**
- **electron-vite** for fast HMR builds
- **Pinia** for state management
- **UnoCSS** for utility-first styling
- **Canvas 2D** for pet animation
- **Web Audio API** (AnalyserNode) for beat detection
- **yt-dlp** for YouTube audio extraction

## Getting Started

### Prerequisites

- Node.js 20+
- Firefox with a YouTube/Google account logged in (needed for yt-dlp cookies)

### Setup

```bash
git clone <repo-url>
cd pixel-beat
npm install
node scripts/download-ytdlp.mjs
npm run dev
```

### Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Built artifacts are output to `dist-release/`.

## How to get your YouTube Music playlist URL

1. Open [YouTube Music](https://music.youtube.com)
2. Go to your playlist
3. Copy the URL from the address bar (e.g. `https://music.youtube.com/playlist?list=PL...`)
4. Paste it in PixelBeat's Import dialog

## License

MIT
