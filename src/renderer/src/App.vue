<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePlaylistStore } from './stores/playlistStore'
import { usePlayerStore } from './stores/playerStore'
import { usePlayer } from './composables/usePlayer'
import TitleBar from './components/TitleBar.vue'
import ImportModal from './components/ImportModal.vue'
import PlaylistPanel from './components/PlaylistPanel.vue'
import PlayerControls from './components/PlayerControls.vue'
import PetCanvas from './components/PetCanvas.vue'
import type { Track } from '../../shared/types'

const playlistStore = usePlaylistStore()
const playerStore = usePlayerStore()
const player = usePlayer()

const showImportModal = ref(false)
const importing = ref(false)
const importError = ref('')

onMounted(async () => {
  await playlistStore.loadFromDisk()
  await playerStore.loadFromDisk()

  // Tray controls
  window.api.onTrayTogglePlay(() => player.audio.togglePlayPause())
  window.api.onTrayNext(() => player.next())
  window.api.onTrayPrevious(() => player.previous())

  // Restore last track (without auto-playing)
  const last = await playerStore.getLastTrack()
  if (last) {
    const tracks = playlistStore.playlists.flatMap((p) => p.tracks)
    const idx = tracks.findIndex((t) => t.id === last.trackId)
    if (idx !== -1) {
      playlistStore.setQueue(tracks, idx)
      playerStore.currentTrack = tracks[idx]
    }
  }
})

const pet_state_label = computed(() => {
  const e = player.beatDetector.energy
  if (e.overall === 0) return 'Sleeping...'
  if (e.overall < 0.15) return 'Chilling'
  if (e.bass > 0.7) return 'HEADBANG!'
  if (e.bass > 0.5) return 'Jumping!'
  return 'Dancing~'
})

const allTracks = computed(() => {
  return playlistStore.playlists.flatMap((p) => p.tracks)
})

async function handleImport(url: string): Promise<void> {
  importing.value = true
  importError.value = ''

  try {
    const result = await window.api.importPlaylist(url)

    const playlist = {
      id: Date.now().toString(),
      title: result.title,
      tracks: result.tracks,
      importedAt: Date.now()
    }

    await playlistStore.addPlaylist(playlist)
    showImportModal.value = false
  } catch (e) {
    importError.value = e instanceof Error ? e.message : 'Failed to import playlist'
  } finally {
    importing.value = false
  }
}

function handleTrackSelect(_track: Track, index: number): void {
  playlistStore.setQueue(allTracks.value, index)
  player.playTrackAtIndex(index)
}
</script>

<template>
  <div class="flex flex-col h-full bg-bg-dark text-text-primary">
    <TitleBar @import="showImportModal = true" />

    <main class="flex-1 overflow-hidden flex">
      <PlaylistPanel
        class="flex-1"
        :tracks="allTracks"
        :current-track-id="playerStore.currentTrack?.id"
        @select="handleTrackSelect"
        @remove="playlistStore.removeTrack"
        @clear="playlistStore.clearAll"
      />

      <!-- Pet & energy panel -->
      <div class="w-52 flex flex-col items-center border-l-2 border-bg-light p-3 gap-3">
        <PetCanvas
          :energy="player.beatDetector.energy"
          :is-playing="playerStore.isPlaying"
        />

        <!-- Energy bars -->
        <div v-if="playerStore.isPlaying" class="w-full flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-text-dim w-8" style="font-size: 7px;">BASS</span>
            <div class="pixel-bar flex-1">
              <div class="pixel-bar__fill" :style="{ width: (player.beatDetector.energy.bass * 100) + '%' }" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-text-dim w-8" style="font-size: 7px;">MID</span>
            <div class="pixel-bar pixel-bar--volume flex-1">
              <div class="pixel-bar__fill" :style="{ width: (player.beatDetector.energy.mid * 100) + '%' }" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-text-dim w-8" style="font-size: 7px;">HIGH</span>
            <div class="pixel-bar flex-1" style="border-color: var(--bg-light);">
              <div class="h-full" :style="{ width: (player.beatDetector.energy.high * 100) + '%', background: 'var(--bg-light)' }" />
            </div>
          </div>
        </div>

        <p class="text-text-dim" style="font-size: 7px;">
          {{ playerStore.isPlaying ? pet_state_label : 'Waiting...' }}
        </p>
      </div>
    </main>

    <div v-if="player.playbackError.value" class="px-4 py-1 bg-accent-soft/30 text-text-primary border-t border-accent-soft" style="font-size: 7px;">
      {{ player.playbackError.value }}
    </div>

    <div v-if="importError" class="px-4 py-1 bg-accent/20 text-accent" style="font-size: 7px;">
      {{ importError }}
      <button class="ml-2 underline" @click="importError = ''">dismiss</button>
    </div>

    <div v-if="importing" class="px-4 py-1 bg-bg-mid text-text-dim border-t border-accent-soft" style="font-size: 7px;">
      Importing playlist...
    </div>

    <footer class="bg-bg-mid border-t-2 border-accent">
      <PlayerControls
        @previous="player.previous"
        @next="player.next"
        @toggle-play-pause="player.audio.togglePlayPause"
        @seek="player.audio.seek"
        @volume="player.audio.setVolume"
        @toggle-shuffle="player.toggleShuffle"
        @cycle-repeat="player.cycleRepeat"
      />
    </footer>

    <ImportModal
      v-if="showImportModal"
      @close="showImportModal = false"
      @import="handleImport"
    />
  </div>
</template>
