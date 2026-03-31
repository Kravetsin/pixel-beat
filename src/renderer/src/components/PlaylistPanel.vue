<script setup lang="ts">
import type { Track } from '../../../shared/types'

defineProps<{
  tracks: Track[]
  currentTrackId?: string
}>()

const emit = defineEmits<{
  select: [track: Track, index: number]
  remove: [trackId: string]
  clear: []
}>()

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="px-4 py-2 border-b-2 border-accent-soft flex items-center justify-between">
      <span class="text-text-dim" style="font-size: 7px;">{{ tracks.length }} tracks</span>
      <button
        v-if="tracks.length > 0"
        class="pixel-btn--ghost px-2 py-1"
        style="font-size: 7px;"
        @click="emit('clear')"
      >
        Clear all
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div
        v-for="(track, index) in tracks"
        :key="track.id"
        class="flex items-center gap-3 px-4 py-2 cursor-pointer border-b border-bg-light/50 hover:bg-bg-light/50"
        :class="{ 'bg-bg-light border-l-2 border-l-accent': track.id === currentTrackId }"
        @click="emit('select', track, index)"
      >
        <img
          v-if="track.thumbnail"
          :src="track.thumbnail"
          :alt="track.title"
          class="w-9 h-9 object-cover border-2 border-accent-soft flex-shrink-0"
        />
        <div v-else class="w-9 h-9 bg-accent-soft border-2 border-accent-soft flex-shrink-0 flex items-center justify-center">
          <span>♪</span>
        </div>

        <div class="flex-1 min-w-0">
          <p class="truncate" :class="track.id === currentTrackId ? 'text-accent' : 'text-text-primary'" style="font-size: 8px;">
            {{ track.title }}
          </p>
          <p class="text-text-dim truncate mt-1" style="font-size: 7px;">
            {{ track.artist }}
          </p>
        </div>

        <span class="text-text-dim flex-shrink-0" style="font-size: 7px;">
          {{ formatDuration(track.duration) }}
        </span>

        <button
          class="pixel-btn--ghost text-text-dim hover:text-accent flex-shrink-0 px-1"
          title="Remove track"
          @click.stop="emit('remove', track.id)"
        >x</button>
      </div>

      <div v-if="tracks.length === 0" class="flex items-center justify-center h-full">
        <p class="text-text-dim" style="font-size: 8px;">No tracks yet. Import a playlist to get started.</p>
      </div>
    </div>
  </div>
</template>
