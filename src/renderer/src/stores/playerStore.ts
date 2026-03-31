import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Track } from '../../../shared/types'

export interface PlayerSettings {
  volume: number
  shuffle: boolean
  repeat: 'none' | 'one' | 'all'
  lastTrackId: string | null
  lastTime: number
}

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref<Track | null>(null)
  const isPlaying = ref(false)
  const volume = ref(0.8)
  const currentTime = ref(0)
  const duration = ref(0)
  const shuffle = ref(false)
  const repeat = ref<'none' | 'one' | 'all'>('none')

  let saveTimeout: ReturnType<typeof setTimeout> | null = null

  function saveToDisk(): void {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(async () => {
      const settings: PlayerSettings = {
        volume: volume.value,
        shuffle: shuffle.value,
        repeat: repeat.value,
        lastTrackId: currentTrack.value?.id ?? null,
        lastTime: currentTime.value
      }
      await window.api.saveData('playerSettings', settings)
    }, 1000)
  }

  async function loadFromDisk(): Promise<void> {
    const saved = await window.api.loadData<PlayerSettings>('playerSettings')
    if (saved) {
      volume.value = saved.volume ?? 0.8
      shuffle.value = saved.shuffle ?? false
      repeat.value = saved.repeat ?? 'none'
    }
    return saved?.lastTrackId ? undefined : undefined
  }

  async function getLastTrack(): Promise<{ trackId: string; time: number } | null> {
    const saved = await window.api.loadData<PlayerSettings>('playerSettings')
    if (saved?.lastTrackId) {
      return { trackId: saved.lastTrackId, time: saved.lastTime ?? 0 }
    }
    return null
  }

  // Auto-save when settings change
  watch([volume, shuffle, repeat], () => saveToDisk())
  watch(currentTime, () => saveToDisk())

  return {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    shuffle,
    repeat,
    loadFromDisk,
    getLastTrack
  }
})
