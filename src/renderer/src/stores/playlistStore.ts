import { defineStore } from 'pinia'
import { ref, toRaw } from 'vue'
import type { Playlist, Track } from '../../../shared/types'

export const usePlaylistStore = defineStore('playlist', () => {
  const playlists = ref<Playlist[]>([])
  const queue = ref<Track[]>([])
  const queueIndex = ref(-1)

  async function loadFromDisk(): Promise<void> {
    const saved = await window.api.loadData<Playlist[]>('playlists')
    if (saved) {
      playlists.value = saved
    }
  }

  async function saveToDisk(): Promise<void> {
    const raw = JSON.parse(JSON.stringify(playlists.value))
    await window.api.saveData('playlists', raw)
  }

  async function addPlaylist(playlist: Playlist): Promise<void> {
    playlists.value.push(playlist)
    await saveToDisk()
  }

  async function removePlaylist(id: string): Promise<void> {
    playlists.value = playlists.value.filter((p) => p.id !== id)
    await saveToDisk()
  }

  async function removeTrack(trackId: string): Promise<void> {
    for (const playlist of playlists.value) {
      playlist.tracks = playlist.tracks.filter((t) => t.id !== trackId)
    }
    playlists.value = playlists.value.filter((p) => p.tracks.length > 0)
    await saveToDisk()
  }

  async function clearAll(): Promise<void> {
    playlists.value = []
    queue.value = []
    queueIndex.value = -1
    await saveToDisk()
  }

  function setQueue(tracks: Track[], startIndex = 0): void {
    queue.value = tracks
    queueIndex.value = startIndex
  }

  return {
    playlists,
    queue,
    queueIndex,
    loadFromDisk,
    addPlaylist,
    removePlaylist,
    removeTrack,
    clearAll,
    setQueue
  }
})
