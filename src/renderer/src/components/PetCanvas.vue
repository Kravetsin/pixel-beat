<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { PetEngine } from '../pet/PetEngine'
import type { BeatEnergy } from '../composables/useBeatDetector'

const props = defineProps<{
  energy: BeatEnergy
  isPlaying: boolean
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const pet = new PetEngine()

let rafId: number | null = null
let lastTime = 0

function loop(timestamp: number): void {
  const dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016
  lastTime = timestamp

  pet.update(props.energy, dt)

  const canvas = canvasRef.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.imageSmoothingEnabled = false
      pet.render(ctx, canvas.width, canvas.height)
    }
  }

  rafId = requestAnimationFrame(loop)
}

onMounted(() => {
  rafId = requestAnimationFrame(loop)
})

onUnmounted(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
})
</script>

<template>
  <div class="flex items-center justify-center">
    <canvas
      ref="canvasRef"
      width="200"
      height="200"
      class="border-2 border-accent-soft bg-bg-dark"
      style="image-rendering: pixelated;"
    />
  </div>
</template>
