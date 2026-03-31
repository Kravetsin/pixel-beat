<script setup lang="ts">
defineEmits<{
  import: []
}>()

function minimize(): void { window.api.windowMinimize() }
function maximize(): void { window.api.windowMaximize() }
function close(): void { window.api.windowClose() }
</script>

<template>
  <header class="titlebar-drag flex items-center justify-between h-10 px-3 bg-bg-mid border-b-2 border-accent select-none">
    <h1 class="text-accent" style="font-size: 10px; letter-spacing: 2px;">PixelBeat</h1>

    <div class="flex items-center gap-1 titlebar-no-drag">
      <button
        class="pixel-btn"
        style="font-size: 7px;"
        @click="$emit('import')"
      >
        + Import
      </button>

      <div class="flex items-center ml-3">
        <button
          class="pixel-btn--ghost px-2 py-1 text-text-dim hover:text-text-primary"
          style="font-size: 10px;"
          @click="minimize"
        >_</button>
        <button
          class="pixel-btn--ghost px-2 py-1 text-text-dim hover:text-text-primary"
          style="font-size: 10px;"
          @click="maximize"
        >□</button>
        <button
          class="pixel-btn--ghost px-2 py-1 text-text-dim hover:text-accent"
          style="font-size: 10px;"
          @click="close"
        >x</button>
      </div>
    </div>
  </header>
</template>
