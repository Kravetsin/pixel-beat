<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  close: []
  import: [url: string]
}>()

const url = ref('')
const loading = ref(false)
const error = ref('')

async function handleImport(): Promise<void> {
  const trimmed = url.value.trim()
  if (!trimmed) return

  if (!trimmed.includes('youtube.com/') && !trimmed.includes('youtu.be/') && !trimmed.includes('music.youtube.com/')) {
    error.value = 'Enter a valid YouTube URL'
    return
  }

  error.value = ''
  loading.value = true

  try {
    emit('import', trimmed)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Import failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" @click.self="emit('close')">
    <div class="bg-bg-mid border-2 border-accent p-6 w-full max-w-md shadow-lg shadow-black/50">
      <h2 style="font-size: 10px;" class="mb-5 text-accent">Import Playlist</h2>

      <input
        v-model="url"
        type="text"
        placeholder="Paste YouTube Music playlist URL..."
        class="w-full px-3 py-2 bg-bg-dark border-2 border-accent-soft text-text-primary outline-none focus:border-accent"
        style="font-family: 'Press Start 2P', monospace; font-size: 7px;"
        :disabled="loading"
        @keydown.enter="handleImport"
      />

      <p v-if="error" class="text-accent mt-2" style="font-size: 7px;">{{ error }}</p>

      <div class="flex justify-end gap-3 mt-5">
        <button class="pixel-btn" style="border-color: var(--accent-soft);" :disabled="loading" @click="emit('close')">
          Cancel
        </button>
        <button class="pixel-btn" :disabled="loading || !url.trim()" @click="handleImport">
          {{ loading ? 'Wait...' : 'Import' }}
        </button>
      </div>
    </div>
  </div>
</template>
