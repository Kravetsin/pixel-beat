import { ref, watch } from 'vue'
import { usePlayerStore } from '../stores/playerStore'

const urlCache = new Map<string, { url: string; fetchedAt: number }>()
const URL_TTL = 5 * 60 * 60 * 1000 // 5 hours

async function fetchStreamUrl(videoId: string): Promise<string> {
  const cached = urlCache.get(videoId)
  if (cached && Date.now() - cached.fetchedAt < URL_TTL) {
    return cached.url
  }

  const url = await window.api.getStreamUrl(videoId)
  urlCache.set(videoId, { url, fetchedAt: Date.now() })
  return url
}

export function useAudio() {
  const playerStore = usePlayerStore()
  const audio = new Audio()
  audio.crossOrigin = 'anonymous'
  audio.volume = playerStore.volume
  const loading = ref(false)

  let rafId: number | null = null

  function syncTime(): void {
    playerStore.currentTime = audio.currentTime
    playerStore.duration = audio.duration || 0
    rafId = requestAnimationFrame(syncTime)
  }

  function startTimeSync(): void {
    if (rafId !== null) return
    syncTime()
  }

  function stopTimeSync(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  audio.addEventListener('play', () => {
    playerStore.isPlaying = true
    startTimeSync()
  })

  audio.addEventListener('pause', () => {
    playerStore.isPlaying = false
    stopTimeSync()
  })

  audio.addEventListener('ended', () => {
    playerStore.isPlaying = false
    stopTimeSync()
    onTrackEnded?.()
  })

  let retrying = false
  audio.addEventListener('error', async () => {
    if (retrying) return
    retrying = true
    // On 403/network error, invalidate cache and retry once
    const track = playerStore.currentTrack
    if (track) {
      urlCache.delete(track.id)
      try {
        const freshUrl = await fetchStreamUrl(track.id)
        audio.src = freshUrl
        await audio.play()
      } catch {
        playerStore.isPlaying = false
        loading.value = false
        onTrackEnded?.()
      }
    }
    retrying = false
  })

  let onBeforePlay: (() => Promise<void>) | null = null
  let onTrackEnded: (() => void) | null = null

  function setOnBeforePlay(cb: () => Promise<void>): void {
    onBeforePlay = cb
  }

  function setOnEnded(cb: () => void): void {
    onTrackEnded = cb
  }

  async function play(videoId: string): Promise<boolean> {
    loading.value = true
    try {
      const url = await fetchStreamUrl(videoId)
      audio.src = url
      if (onBeforePlay) await onBeforePlay()
      await audio.play()
      return true
    } catch (e) {
      console.error('Playback failed:', e)
      playerStore.isPlaying = false
      return false
    } finally {
      loading.value = false
    }
  }

  function pause(): void {
    audio.pause()
  }

  function resume(): void {
    audio.play()
  }

  function togglePlayPause(): void {
    if (audio.paused) {
      resume()
    } else {
      pause()
    }
  }

  function seek(time: number): void {
    audio.currentTime = time
  }

  function setVolume(v: number): void {
    audio.volume = v
    playerStore.volume = v
  }

  async function prefetch(videoId: string): Promise<void> {
    try {
      await fetchStreamUrl(videoId)
    } catch {
      // silent prefetch failure is fine
    }
  }

  watch(() => playerStore.volume, (v) => {
    audio.volume = v
  })

  return {
    loading,
    play,
    pause,
    resume,
    togglePlayPause,
    seek,
    setVolume,
    setOnBeforePlay,
    setOnEnded,
    prefetch,
    audioElement: audio
  }
}
