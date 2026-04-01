<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
import { usePet } from '../composables/usePet'

defineEmits<{
  import: []
}>()

const { currentTheme, nextTheme } = useTheme()
const { currentPet, nextPet } = usePet()

function minimize(): void { window.api.windowMinimize() }
function maximize(): void { window.api.windowMaximize() }
function close(): void { window.api.windowClose() }
function enterPetMode(): void {
  const { body, dark, inner, eyeGlow } = currentTheme.value.pet
  window.api.enterPetMode({
    petType: currentPet.value.id,
    petColors: { body, dark, inner, eyeGlow }
  })
}
</script>

<template>
  <header class="titlebar-drag flex items-center justify-between h-10 px-3 bg-bg-mid border-b-2 border-accent select-none">
    <h1 class="text-accent" style="font-size: 10px; letter-spacing: 2px;">PixelBeat</h1>

    <div class="flex items-center gap-1 titlebar-no-drag">
      <!-- Pet switcher -->
      <button
        class="pixel-btn--ghost px-2 py-1 text-text-dim hover:text-accent"
        style="font-size: 8px;"
        :title="'Pet: ' + currentPet.name"
        @click="nextPet()"
      >
        {{ currentPet.name }}
      </button>

      <!-- Theme switcher -->
      <button
        class="pixel-btn--ghost px-2 py-1 text-text-dim hover:text-accent"
        style="font-size: 8px;"
        :title="'Theme: ' + currentTheme.name"
        @click="nextTheme()"
      >
        {{ currentTheme.name }}
      </button>

      <button
        class="pixel-btn"
        style="font-size: 7px;"
        @click="$emit('import')"
      >
        + Import
      </button>

      <button
        class="pixel-btn--ghost px-2 py-1 text-text-dim hover:text-accent"
        style="font-size: 8px;"
        title="Pet Mode"
        @click="enterPetMode"
      >
        PET
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
