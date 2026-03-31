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
  onTrayPrevious: (cb: () => void) => ipcRenderer.on('tray:previous', cb)
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
