# PixelBeat — Pixel Art YouTube Music Player

> A free, open-source desktop music player that imports YouTube Music playlists and features an animated pixel pet that dances to the beat in real time.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Desktop shell | **Electron 33+** | Cross-platform desktop app with Node.js backend and Chromium renderer |
| Build tool | **Vite + electron-vite** | Fast HMR, first-class Electron support, single config for main/renderer/preload |
| Frontend | **Vue 3 + Composition API** | Lightweight, familiar (Nuxt background), great with Canvas |
| State management | **Pinia** | Playlist queue, player state, pet state |
| Styling | **UnoCSS / Tailwind** | Utility-first, easy to combine with custom pixel art CSS |
| Canvas rendering | **Plain Canvas 2D API** | Sprite sheet animation is simple enough — no need for PixiJS overhead |
| Audio analysis | **Web Audio API (AnalyserNode)** | Built-in FFT for beat detection, zero dependencies |
| YouTube extraction | **yt-dlp** (bundled binary) | Extracts audio stream URLs and playlist metadata. Battle-tested, actively maintained |
| yt-dlp Node wrapper | **yt-dlp-wrap** or raw `child_process.execFile` | Calls yt-dlp binary from Electron main process |
| Local storage | **electron-store** | Persist playlists, settings, pet choice between sessions |
| Packaging | **electron-builder** | Produces .exe / .dmg / .AppImage with auto-update support |

### Why NOT these alternatives

- **React** — Vue is closer to your Nuxt workflow and lighter for this scope
- **PixiJS / Phaser** — overkill for a single sprite + simple animations; plain Canvas keeps the bundle small
- **Howler.js** — we need `AnalyserNode` for beat detection, which requires Web Audio API directly; Howler wraps it but adds complexity
- **ytdl-core** — frequently breaks, less maintained than yt-dlp
- **Tauri** — great in theory but yt-dlp integration and Web Audio API work more reliably in Electron's full Node.js + Chromium environment

---

## Project Structure

```
pixelbeat/
├── electron/
│   ├── main.ts                 # Electron main process, window creation
│   ├── preload.ts              # IPC bridge (exposes safe APIs to renderer)
│   └── services/
│       ├── ytdlp.ts            # yt-dlp wrapper: playlist import, audio URL extraction
│       └── store.ts            # electron-store: persist playlists & settings
├── src/                        # Renderer process (Vue app)
│   ├── App.vue
│   ├── main.ts                 # Vue app entry
│   ├── components/
│   │   ├── PlayerControls.vue  # Play/pause/skip, progress bar, volume
│   │   ├── PlaylistPanel.vue   # Track list with pixel art styling
│   │   ├── ImportModal.vue     # Paste YouTube Music playlist URL
│   │   ├── PetCanvas.vue       # Canvas element + animation loop
│   │   └── Visualizer.vue      # Optional: pixel-style frequency bars
│   ├── composables/
│   │   ├── useAudio.ts         # HTMLAudioElement + Web Audio API setup
│   │   ├── useBeatDetector.ts  # AnalyserNode → bass/mid/high energy
│   │   └── usePlayer.ts       # Play queue logic: next/prev/shuffle/repeat
│   ├── pet/
│   │   ├── PetEngine.ts        # Animation state machine
│   │   ├── sprites/            # PNG sprite sheets (idle, dance, jump, sleep)
│   │   └── pets.config.ts      # Registry of available pets + their sprite maps
│   ├── stores/
│   │   ├── playerStore.ts      # Current track, playback state, volume
│   │   └── playlistStore.ts    # Imported playlists, queue order
│   ├── styles/
│   │   ├── pixel-theme.css     # Pixel art font, borders, color palette
│   │   └── components.css      # Styled scrollbars, buttons, sliders
│   └── assets/
│       ├── fonts/              # Pixel font (e.g., Press Start 2P)
│       └── ui/                 # Pixel art UI elements (icons, frames)
├── resources/
│   └── yt-dlp/                 # Bundled yt-dlp binaries per platform
│       ├── yt-dlp.exe          # Windows
│       ├── yt-dlp_macos        # macOS
│       └── yt-dlp_linux        # Linux
├── electron-builder.yml        # Packaging config
├── electron.vite.config.ts     # electron-vite config
├── package.json
├── tsconfig.json
└── README.md
```

---

## Development Plan

### Phase 0 — Project Scaffolding (Day 1)

**Goal:** Empty Electron + Vue app running with hot reload.

Steps:

1. Initialize project with electron-vite:
   ```bash
   npm create @quick-start/electron pixelbeat -- --template vue-ts
   cd pixelbeat
   npm install
   ```
2. Verify `npm run dev` opens an Electron window with Vue HMR working.
3. Set up basic folder structure as described above.
4. Install core dependencies:
   ```bash
   npm install pinia electron-store
   npm install -D unocss @unocss/preset-uno
   ```
5. Configure UnoCSS in Vite config.
6. Set up IPC bridge skeleton in `preload.ts`:
   ```ts
   contextBridge.exposeInMainWorld('electronAPI', {
     importPlaylist: (url: string) => ipcRenderer.invoke('playlist:import', url),
     getStreamUrl: (videoId: string) => ipcRenderer.invoke('audio:get-stream-url', videoId),
     saveData: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
     loadData: (key: string) => ipcRenderer.invoke('store:get', key),
   });
   ```
7. Create TypeScript types for IPC in a shared `types/` folder.

**Deliverable:** Running Electron app with Vue, Pinia, and IPC bridge ready.

---

### Phase 1 — YouTube Playlist Import (Days 2–3)

**Goal:** User pastes a YouTube Music playlist URL → app shows a list of tracks.

Steps:

1. Bundle `yt-dlp` binary into `resources/yt-dlp/`:
   - Download platform-specific binaries from yt-dlp releases.
   - Write a helper to resolve the correct binary path at runtime (dev vs packaged).
2. Create `electron/services/ytdlp.ts`:
   ```ts
   // Core functions:
   async function importPlaylist(url: string): Promise<Track[]>
   // Uses: yt-dlp --flat-playlist --dump-json <url>
   // Returns: array of { id, title, artist, duration, thumbnail }

   async function getAudioStreamUrl(videoId: string): Promise<string>
   // Uses: yt-dlp -f bestaudio --get-url <url>
   // Returns: direct audio stream URL (valid for ~6 hours)
   ```
3. Register IPC handlers in `main.ts`:
   ```ts
   ipcMain.handle('playlist:import', (_, url) => importPlaylist(url));
   ipcMain.handle('audio:get-stream-url', (_, id) => getAudioStreamUrl(id));
   ```
4. Build `ImportModal.vue`:
   - Text input for URL.
   - "Import" button → calls `window.electronAPI.importPlaylist(url)`.
   - Loading state while yt-dlp runs.
   - Error handling (invalid URL, private playlist, etc.).
5. Build `PlaylistPanel.vue`:
   - Display imported tracks: thumbnail, title, artist, duration.
   - Click to select a track.
   - Store playlist in Pinia `playlistStore`.
6. Persist playlists with `electron-store` so they survive app restarts.

**Deliverable:** Paste a YouTube Music playlist link → see all tracks in a list.

---

### Phase 2 — Audio Playback Engine (Days 4–5)

**Goal:** Click a track → music plays with full player controls.

Steps:

1. Create `composables/useAudio.ts`:
   ```ts
   // Wraps HTMLAudioElement
   // - play(videoId) → fetches stream URL via IPC, sets audio.src, plays
   // - pause(), resume(), seek(seconds)
   // - Reactive state: currentTime, duration, isPlaying, volume
   // - Events: onEnded → trigger next track
   ```
2. Create `composables/usePlayer.ts`:
   ```ts
   // Queue management on top of useAudio:
   // - next(), previous()
   // - shuffle mode (Fisher-Yates on queue copy)
   // - repeat modes: none / one / all
   // - Auto-advance on track end
   ```
3. Handle audio URL expiration:
   - Stream URLs expire after ~6 hours.
   - On playback error (403), automatically re-fetch URL and retry.
   - Add a simple in-memory cache: `Map<videoId, { url, fetchedAt }>`.
   - Pre-fetch next track's URL when current track starts playing.
4. Build `PlayerControls.vue`:
   - Play / Pause / Previous / Next buttons.
   - Progress bar (seekable).
   - Volume slider.
   - Current track info (title, artist, thumbnail).
   - Shuffle / Repeat toggle.
5. Wire keyboard shortcuts:
   - `Space` — play/pause.
   - `←` / `→` — seek ±10s.
   - `Ctrl+←` / `Ctrl+→` — prev/next track.

**Deliverable:** Fully functional music player — import playlist, click track, listen.

---

### Phase 3 — Beat Detection (Days 6–7)

**Goal:** Real-time audio analysis providing energy values for pet animation.

Steps:

1. Create `composables/useBeatDetector.ts`:
   ```ts
   // Sets up Web Audio API chain:
   // AudioElement → MediaElementSource → AnalyserNode → Destination
   //
   // Exports reactive energy values updated every animation frame:
   // { bass: 0-1, mid: 0-1, high: 0-1, overall: 0-1 }
   //
   // Bass (20-150Hz)  → bins 0-10   → drives jumps/bounces
   // Mid (150-2kHz)   → bins 10-100 → drives dancing/swaying
   // High (2kHz+)     → bins 100+   → drives eye blinks/sparkles
   ```
2. Implement simple beat detection:
   ```ts
   // Track energy history (last ~0.5s)
   // A "beat" = current energy > average energy * threshold (e.g., 1.4)
   // This gives a boolean `isBeat` signal per frequency band
   ```
3. Add smoothing to avoid jittery animations:
   ```ts
   // Exponential moving average:
   // smoothed = smoothed * 0.8 + raw * 0.2
   ```
4. Test with different music genres to tune thresholds.

**Deliverable:** `useBeatDetector()` composable that returns real-time `{ bass, mid, high, isBeat }`.

---

### Phase 4 — Pixel Pet Animation (Days 8–12)

**Goal:** Animated pixel pet that reacts to music in real time.

Steps:

1. **Create sprite sheets** (or find free pixel art assets):
   - States needed: `idle`, `dance`, `jump`, `headbang`, `sleep` (when paused).
   - Each state = horizontal strip of frames (e.g., 6 frames, 32×32 px each).
   - Recommended sprite sheet format:
     ```
     idle:     [frame0][frame1][frame2][frame3]
     dance:    [frame0][frame1][frame2][frame3][frame4][frame5]
     jump:     [frame0][frame1][frame2][frame3]
     headbang: [frame0][frame1][frame2][frame3]
     sleep:    [frame0][frame1]
     ```
2. Create `pet/PetEngine.ts` — animation state machine:
   ```ts
   class PetEngine {
     state: 'idle' | 'dance' | 'jump' | 'headbang' | 'sleep'
     frame: number
     animSpeed: number     // frames per second, driven by energy
     scaleY: number        // squash & stretch on bass hits
     offsetX: number       // sway on mid energy
     eyeGlow: boolean      // sparkle on high energy

     update(energy: BeatEnergy, dt: number): void
     // State transitions:
     // - No music / paused → sleep
     // - Low energy → idle (gentle bobbing)
     // - Mid energy → dance
     // - High bass energy → jump
     // - Sustained high energy → headbang
     // - Beat hit → squash & stretch (scaleY pulse)

     render(ctx: CanvasRenderingContext2D): void
     // Draws current sprite frame with transforms applied
   }
   ```
3. Build `PetCanvas.vue`:
   ```vue
   <!-- Hosts <canvas>, runs requestAnimationFrame loop -->
   <!-- Receives beat energy from useBeatDetector -->
   <!-- Renders PetEngine each frame -->
   <!-- Canvas size: ~200x200, image-rendering: pixelated -->
   ```
4. Add squash & stretch physics:
   ```ts
   // On bass beat:
   //   scaleY = 1.3 (stretch up)
   //   then spring back: scaleY += (1.0 - scaleY) * 0.15 per frame
   // This gives a bouncy, organic feel
   ```
5. Add horizontal sway:
   ```ts
   // offsetX = sin(time * midEnergy * 5) * midEnergy * 8
   // Faster and wider sway with more mid energy
   ```
6. Register multiple pets in `pets.config.ts`:
   ```ts
   export const pets = {
     cat: { name: 'Pixel Cat', spriteSheet: catSprite, frameSize: 32 },
     dog: { name: 'Pixel Dog', spriteSheet: dogSprite, frameSize: 32 },
     dragon: { name: 'Pixel Dragon', spriteSheet: dragonSprite, frameSize: 48 },
   };
   ```
7. Add pet selector in settings/UI.

**Deliverable:** Pixel pet visibly dancing, jumping, and reacting to the music.

---

### Phase 5 — Pixel Art UI & Polish (Days 13–16)

**Goal:** Complete pixel art visual theme.

Steps:

1. **Typography:**
   - Use "Press Start 2P" or "Silkscreen" pixel font from Google Fonts.
   - Apply globally with appropriate sizes (pixel fonts need specific sizes: 8px, 16px, 24px).
2. **Color palette** — define a limited palette (like a retro console):
   ```css
   :root {
     --bg-dark: #1a1a2e;
     --bg-mid: #16213e;
     --bg-light: #0f3460;
     --accent: #e94560;
     --accent-soft: #533483;
     --text: #eee;
     --text-dim: #888;
   }
   ```
3. **UI components to pixel-ify:**
   - Buttons → 2px solid borders, no border-radius, box-shadow for 3D press effect.
   - Progress bar → segmented (discrete blocks instead of smooth fill).
   - Volume slider → same segmented style.
   - Scrollbar → custom pixel-style scrollbar.
   - Track list items → pixel card with hover state.
   - Window frame → custom title bar (frameless Electron window + custom drag region).
4. **Optional: Pixel visualizer bars:**
   - A row of 16–32 frequency bars below/behind the pet.
   - Each bar = column of pixel blocks, height driven by frequency data.
   - Adds to the retro aesthetic and makes the beat visible.
5. **Animations & transitions:**
   - Page transitions: pixel dissolve / scanline wipe.
   - Button hover: color shift + 1px translate (press effect).
   - Track change: brief flash or pet reaction.
6. **Custom frameless window:**
   ```ts
   // main.ts
   new BrowserWindow({
     frame: false,
     titleBarStyle: 'hidden',
     // ...
   });
   ```
   - Add custom title bar with drag region, minimize/maximize/close buttons in pixel style.

**Deliverable:** Polished, cohesive pixel art UI that looks like a retro game.

---

### Phase 6 — Persistence & Settings (Days 17–18)

**Goal:** App remembers everything between sessions.

Steps:

1. Persist with `electron-store`:
   - Saved playlists (track metadata, not audio).
   - Last played track + position.
   - Volume, shuffle, repeat settings.
   - Selected pet.
   - Window size & position.
2. Build Settings panel:
   - Pet selector (preview animation for each).
   - Theme variant (if offering multiple palettes).
   - Audio quality preference (pass to yt-dlp: `-f bestaudio` vs specific bitrate).
   - "Resume where I left off" toggle.
3. Add system tray integration:
   - Minimize to tray.
   - Tray context menu: Play/Pause, Next, Previous, Quit.

**Deliverable:** App feels stateful and "lived in" — everything persists.

---

### Phase 7 — Packaging & Distribution (Days 19–20)

**Goal:** Downloadable builds for Windows, macOS, Linux.

Steps:

1. Configure `electron-builder.yml`:
   ```yaml
   appId: com.pixelbeat.app
   productName: PixelBeat
   directories:
     output: dist-release
   files:
     - "dist/**/*"
     - "resources/**/*"
   win:
     target: [nsis, portable]
     icon: resources/icon.ico
   mac:
     target: [dmg]
     icon: resources/icon.icns
   linux:
     target: [AppImage, deb]
     icon: resources/icon.png
   extraResources:
     - from: "resources/yt-dlp/"
       to: "yt-dlp/"
   ```
2. Handle yt-dlp binary paths for packaged app:
   ```ts
   const ytDlpPath = app.isPackaged
     ? path.join(process.resourcesPath, 'yt-dlp', BINARY_NAME)
     : path.join(__dirname, '..', 'resources', 'yt-dlp', BINARY_NAME);
   ```
3. Add auto-update for yt-dlp itself (it needs frequent updates):
   ```ts
   // On app launch, run: yt-dlp --update
   // Or fetch latest release from GitHub API
   ```
4. Set up GitHub Actions for CI:
   - Build on push to `main`.
   - Produce artifacts for all 3 platforms.
   - Publish to GitHub Releases.
5. Write README.md:
   - GIF/video showing the pet dancing.
   - Installation instructions.
   - "How to get your YouTube Music playlist URL" guide.
   - Tech stack badges.
   - License: MIT.

**Deliverable:** Downloadable installers on GitHub Releases.

---

## Milestone Summary

| Phase | What | Timeframe |
|---|---|---|
| 0 | Scaffolding & project setup | Day 1 |
| 1 | YouTube playlist import | Days 2–3 |
| 2 | Audio playback engine | Days 4–5 |
| 3 | Beat detection | Days 6–7 |
| 4 | Pixel pet animation | Days 8–12 |
| 5 | Pixel art UI & polish | Days 13–16 |
| 6 | Persistence & settings | Days 17–18 |
| 7 | Packaging & distribution | Days 19–20 |

**MVP (Phases 0–4):** ~12 days — working player with dancing pet.
**Full v1.0 (All phases):** ~20 days.

---

## Future Ideas (Post v1.0)

- **Pet leveling system** — pet "grows" based on hours of music listened.
- **Multiple pets on screen** — unlockable companions.
- **Spotify support** — same UI, different audio source (Spotify has a Web Playback SDK).
- **SoundCloud support** — SoundCloud has a more permissive API.
- **Visualizer skins** — different retro-styled visualizers (oscilloscope, spectrogram).
- **Discord Rich Presence** — show what you're listening to.
- **Mini mode** — tiny floating window with just the pet + basic controls.
- **Community sprite sheets** — let users create and share custom pets.
- **Last.fm scrobbling** — track listening history.
