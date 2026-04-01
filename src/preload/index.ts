import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  importPlaylist: (url: string) => ipcRenderer.invoke('playlist:import', url),
  getStreamUrl: (videoId: string) => ipcRenderer.invoke('audio:get-stream-url', videoId),
  saveData: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  loadData: (key: string) => ipcRenderer.invoke('store:get', key),
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  onTrayTogglePlay: (cb: () => void) => ipcRenderer.on('tray:toggle-play', cb),
  onTrayNext: (cb: () => void) => ipcRenderer.on('tray:next', cb),
  onTrayPrevious: (cb: () => void) => ipcRenderer.on('tray:previous', cb),
  onUpdateAvailable: (cb: (version: string) => void) => ipcRenderer.on('update:available', (_, v) => cb(v)),
  onUpdateProgress: (cb: (percent: number) => void) => ipcRenderer.on('update:progress', (_, p) => cb(p)),
  onUpdateDownloaded: (cb: () => void) => ipcRenderer.on('update:downloaded', cb),
  downloadUpdate: () => ipcRenderer.send('update:download'),
  installUpdate: () => ipcRenderer.send('update:install'),
  enterPetMode: (config: unknown) => ipcRenderer.send('pet-overlay:enter', config),
  petOverlayRestoreMain: () => ipcRenderer.send('pet-overlay:restore'),
  sendBeatEnergy: (energy: unknown) => ipcRenderer.send('beat-energy:update', energy),
  onBeatEnergy: (cb: (energy: unknown) => void) => ipcRenderer.on('beat-energy:forward', (_, e) => cb(e)),
  onPetConfig: (cb: (config: unknown) => void) => ipcRenderer.on('pet-overlay:config', (_, c) => cb(c)),
  petOverlayTogglePlay: () => ipcRenderer.send('pet-overlay:toggle-play'),
  petOverlayDragStart: (offsetX: number, offsetY: number) => ipcRenderer.send('pet-overlay:drag-start', offsetX, offsetY),
  petOverlayDragEnd: () => ipcRenderer.send('pet-overlay:drag-end')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
