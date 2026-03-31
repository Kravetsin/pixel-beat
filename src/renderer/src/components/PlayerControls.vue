<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerStore } from '../stores/playerStore'

const playerStore = usePlayerStore()

const emit = defineEmits<{
  previous: []
  next: []
  togglePlayPause: []
  seek: [time: number]
  volume: [value: number]
  toggleShuffle: []
  cycleRepeat: []
}>()

const progressPercent = computed(() => {
  if (!playerStore.duration) return 0
  return (playerStore.currentTime / playerStore.duration) * 100
})

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// --- Draggable bar logic ---

const draggingSeek = ref(false)
const draggingVolume = ref(false)
const seekPreview = ref(0)

function ratioFromEvent(e: MouseEvent, bar: HTMLElement): number {
  const rect = bar.getBoundingClientRect()
  return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
}

function startSeekDrag(e: MouseEvent): void {
  const bar = e.currentTarget as HTMLElement
  draggingSeek.value = true
  seekPreview.value = ratioFromEvent(e, bar) * playerStore.duration
  emit('seek', seekPreview.value)

  const onMove = (ev: MouseEvent): void => {
    seekPreview.value = ratioFromEvent(ev, bar) * playerStore.duration
    emit('seek', seekPreview.value)
  }
  const onUp = (): void => {
    draggingSeek.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function startVolumeDrag(e: MouseEvent): void {
  const bar = e.currentTarget as HTMLElement
  draggingVolume.value = true
  emit('volume', ratioFromEvent(e, bar))

  const onMove = (ev: MouseEvent): void => {
    emit('volume', ratioFromEvent(ev, bar))
  }
  const onUp = (): void => {
    draggingVolume.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const repeatLabel = computed(() => {
  switch (playerStore.repeat) {
    case 'one': return 'R1'
    case 'all': return 'RA'
    default: return 'R-'
  }
})
</script>

<template>
  <div class="flex flex-col gap-2 px-4 py-3 select-none">
    <!-- Progress bar -->
    <div class="flex items-center gap-3">
      <span class="text-text-dim w-10 text-right" style="font-size: 7px;">{{ formatTime(playerStore.currentTime) }}</span>
      <div class="pixel-bar flex-1" @mousedown="startSeekDrag">
        <div class="pixel-bar__fill" :style="{ width: progressPercent + '%' }" />
      </div>
      <span class="text-text-dim w-10" style="font-size: 7px;">{{ formatTime(playerStore.duration) }}</span>
    </div>

    <!-- Controls row -->
    <div class="flex items-center justify-between">
      <!-- Track info -->
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <img
          v-if="playerStore.currentTrack?.thumbnail"
          :src="playerStore.currentTrack.thumbnail"
          class="w-10 h-10 object-cover border-2 border-accent-soft flex-shrink-0"
        />
        <div v-if="playerStore.currentTrack" class="min-w-0">
          <p class="truncate text-text-primary" style="font-size: 8px;">{{ playerStore.currentTrack.title }}</p>
          <p class="text-text-dim truncate mt-1" style="font-size: 7px;">{{ playerStore.currentTrack.artist }}</p>
        </div>
        <p v-else class="text-text-dim" style="font-size: 8px;">No track selected</p>
      </div>

      <!-- Playback buttons -->
      <div class="flex items-center gap-1">
        <button
          class="pixel-btn--ghost px-2 py-1"
          :class="{ active: playerStore.shuffle }"
          title="Shuffle"
          @click="emit('toggleShuffle')"
        >S</button>
        <button class="pixel-btn--ghost px-2 py-1" title="Previous" @click="emit('previous')">|&lt;</button>
        <button
          class="pixel-btn px-4 py-1"
          style="font-size: 10px;"
          @click="emit('togglePlayPause')"
        >{{ playerStore.isPlaying ? '||' : '>' }}</button>
        <button class="pixel-btn--ghost px-2 py-1" title="Next" @click="emit('next')">>|</button>
        <button
          class="pixel-btn--ghost px-2 py-1"
          :class="{ active: playerStore.repeat !== 'none' }"
          :title="'Repeat: ' + playerStore.repeat"
          @click="emit('cycleRepeat')"
        >{{ repeatLabel }}</button>
      </div>

      <!-- Volume -->
      <div class="flex items-center gap-2 flex-1 justify-end">
        <span class="text-text-dim" style="font-size: 7px;">VOL</span>
        <div class="pixel-bar pixel-bar--volume w-20" @mousedown="startVolumeDrag">
          <div class="pixel-bar__fill" :style="{ width: (playerStore.volume * 100) + '%' }" />
        </div>
      </div>
    </div>
  </div>
</template>
