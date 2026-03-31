import { ElectronAPI } from '@electron-toolkit/preload'
import type { ElectronAPI as PixelBeatAPI } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: PixelBeatAPI
  }
}
