<script setup lang="ts">
import { ref, onMounted } from 'vue'

const updateVersion = ref('')
const downloading = ref(false)
const progress = ref(0)
const ready = ref(false)
const dismissed = ref(false)

onMounted(() => {
  window.api.onUpdateAvailable((version) => {
    updateVersion.value = version
    dismissed.value = false
  })

  window.api.onUpdateProgress((percent) => {
    progress.value = percent
  })

  window.api.onUpdateDownloaded(() => {
    downloading.value = false
    ready.value = true
  })
})

function download(): void {
  downloading.value = true
  window.api.downloadUpdate()
}

function install(): void {
  window.api.installUpdate()
}

function dismiss(): void {
  dismissed.value = true
}


</script>

<template>
  <div
    v-if="updateVersion && !dismissed"
    class="px-4 py-2 bg-accent-soft/30 border-t border-accent-soft flex items-center justify-between"
    style="font-size: 8px;"
  >
    <template v-if="ready">
      <span class="text-text-primary">v{{ updateVersion }} ready to install</span>
      <button class="pixel-btn" style="font-size: 7px;" @click="install">Restart & Update</button>
    </template>

    <template v-else-if="downloading">
      <span class="text-text-dim">Downloading v{{ updateVersion }}...</span>
      <div class="pixel-bar w-24">
        <div class="pixel-bar__fill" :style="{ width: progress + '%' }" />
      </div>
      <span class="text-text-dim">{{ progress }}%</span>
    </template>

    <template v-else>
      <span class="text-text-primary">Update v{{ updateVersion }} available</span>
      <div class="flex gap-2">
        <button class="pixel-btn" style="font-size: 7px;" @click="download">Download</button>
        <button class="pixel-btn--ghost text-text-dim px-2 py-1" style="font-size: 7px;" @click="dismiss">Later</button>
      </div>
    </template>
  </div>
</template>
