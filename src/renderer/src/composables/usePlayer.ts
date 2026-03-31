import { ref, watch } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { usePlaylistStore } from '../stores/playlistStore'
import { useAudio } from './useAudio'
import { useBeatDetector } from './useBeatDetector'

export function usePlayer() {
  const playerStore = usePlayerStore()
  const playlistStore = usePlaylistStore()
  const audio = useAudio()
  const beatDetector = useBeatDetector(audio.audioElement)
  const playbackError = ref('')

  // Ensure AudioContext is resumed BEFORE audio.play(), then start analysis
  audio.setOnBeforePlay(async () => {
    await beatDetector.ensureReady()
    beatDetector.startAnalysis()
  })

  watch(() => playerStore.isPlaying, (playing) => {
    if (playing) {
      beatDetector.startAnalysis()
    } else {
      beatDetector.stopAnalysis()
    }
  })

  audio.setOnEnded(() => {
    if (playerStore.repeat === 'one') {
      playTrackAtIndex(playlistStore.queueIndex)
    } else {
      next()
    }
  })

  let skipCount = 0
  const MAX_SKIPS = 5

  async function playTrackAtIndex(index: number): Promise<void> {
    const queue = playlistStore.queue
    if (index < 0 || index >= queue.length) return

    playlistStore.queueIndex = index
    const track = queue[index]
    playerStore.currentTrack = track
    const ok = await audio.play(track.id)

    if (!ok) {
      playbackError.value = `"${track.title}" is unavailable, skipping...`
      skipCount++
      if (skipCount <= MAX_SKIPS && queue.length > 1) {
        const nextIdx = (index + 1) % queue.length
        await playTrackAtIndex(nextIdx)
        return
      }
      playbackError.value = 'No playable tracks found'
      skipCount = 0
      return
    }

    skipCount = 0
    playbackError.value = ''

    // Prefetch next track
    const nextIdx = index + 1 < queue.length ? index + 1 : 0
    if (nextIdx !== index) {
      audio.prefetch(queue[nextIdx].id)
    }
  }

  async function playTrack(trackId: string): Promise<void> {
    const index = playlistStore.queue.findIndex((t) => t.id === trackId)
    if (index !== -1) {
      await playTrackAtIndex(index)
    }
  }

  function shuffleQueue(): void {
    const queue = [...playlistStore.queue]
    const current = playerStore.currentTrack

    // Fisher-Yates shuffle
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[queue[i], queue[j]] = [queue[j], queue[i]]
    }

    // Move current track to front if playing
    if (current) {
      const idx = queue.findIndex((t) => t.id === current.id)
      if (idx > 0) {
        ;[queue[0], queue[idx]] = [queue[idx], queue[0]]
      }
      playlistStore.queue = queue
      playlistStore.queueIndex = 0
    } else {
      playlistStore.queue = queue
    }
  }

  async function next(): Promise<void> {
    const queue = playlistStore.queue
    if (queue.length === 0) return

    let nextIndex = playlistStore.queueIndex + 1

    if (nextIndex >= queue.length) {
      if (playerStore.repeat === 'all') {
        nextIndex = 0
      } else {
        playerStore.isPlaying = false
        return
      }
    }

    await playTrackAtIndex(nextIndex)
  }

  async function previous(): Promise<void> {
    // If more than 3 seconds in, restart current track
    if (playerStore.currentTime > 3) {
      audio.seek(0)
      return
    }

    const queue = playlistStore.queue
    if (queue.length === 0) return

    let prevIndex = playlistStore.queueIndex - 1
    if (prevIndex < 0) {
      prevIndex = playerStore.repeat === 'all' ? queue.length - 1 : 0
    }

    await playTrackAtIndex(prevIndex)
  }

  function toggleShuffle(): void {
    playerStore.shuffle = !playerStore.shuffle
    if (playerStore.shuffle) {
      shuffleQueue()
    }
  }

  function cycleRepeat(): void {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'all', 'one']
    const current = modes.indexOf(playerStore.repeat)
    playerStore.repeat = modes[(current + 1) % modes.length]
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        if (playerStore.currentTrack) audio.togglePlayPause()
        break
      case 'ArrowLeft':
        if (e.ctrlKey) {
          previous()
        } else {
          audio.seek(Math.max(0, playerStore.currentTime - 10))
        }
        break
      case 'ArrowRight':
        if (e.ctrlKey) {
          next()
        } else {
          audio.seek(Math.min(playerStore.duration, playerStore.currentTime + 10))
        }
        break
    }
  }

  window.addEventListener('keydown', handleKeydown)

  return {
    audio,
    beatDetector,
    playbackError,
    playTrack,
    playTrackAtIndex,
    next,
    previous,
    toggleShuffle,
    cycleRepeat
  }
}
