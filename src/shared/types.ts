export interface Track {
  id: string
  title: string
  artist: string
  duration: number
  thumbnail: string
}

export interface Playlist {
  id: string
  title: string
  tracks: Track[]
  importedAt: number
}

export interface ImportResult {
  title: string
  tracks: Track[]
}

export interface ElectronAPI {
  importPlaylist: (url: string) => Promise<ImportResult>
  getStreamUrl: (videoId: string) => Promise<string>
  saveData: (key: string, value: unknown) => Promise<void>
  loadData: <T = unknown>(key: string) => Promise<T | undefined>
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
  onTrayTogglePlay: (cb: () => void) => void
  onTrayNext: (cb: () => void) => void
  onTrayPrevious: (cb: () => void) => void
  onUpdateAvailable: (cb: (version: string) => void) => void
  onUpdateProgress: (cb: (percent: number) => void) => void
  onUpdateDownloaded: (cb: () => void) => void
  downloadUpdate: () => void
  installUpdate: () => void
  enterPetMode: (config: { petType: string; petColors: { body: string; dark: string; inner: string; eyeGlow: string } }) => void
  petOverlayRestoreMain: () => void
  sendBeatEnergy: (energy: { kick: number; bass: number; vocal: number; high: number; overall: number; vocalRaw: number; isKickHit: boolean; isSnareHit: boolean }) => void
  onBeatEnergy: (cb: (energy: { kick: number; bass: number; vocal: number; high: number; overall: number; vocalRaw: number; isKickHit: boolean; isSnareHit: boolean }) => void) => void
  onPetConfig: (cb: (config: { petType: string; petColors: { body: string; dark: string; inner: string; eyeGlow: string } }) => void) => void
  petOverlayTogglePlay: () => void
  petOverlayDragStart: (offsetX: number, offsetY: number) => void
  petOverlayDragEnd: () => void
}
