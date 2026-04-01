import { PetEngine } from './pet/PetEngine'
import type { BeatEnergy } from './composables/useBeatDetector'
import type { PetType, PetColors } from './pet/PetEngine'

const canvas = document.getElementById('pet') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
ctx.imageSmoothingEnabled = false

const pet = new PetEngine()
let energy: BeatEnergy = { bass: 0, mid: 0, high: 0, overall: 0, isBeat: false }

window.api.onBeatEnergy((e: BeatEnergy) => {
  energy = e
})

window.api.onPetConfig((config) => {
  pet.petType = config.petType as PetType
  pet.colors = config.petColors as PetColors
})

let lastTime = 0
function loop(timestamp: number): void {
  const dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016
  lastTime = timestamp
  ctx.clearRect(0, 0, 120, 120)
  pet.update(energy, dt)
  pet.render(ctx, 120, 120)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

// Click vs drag
let isDragging = false
let mouseDownX = 0
let mouseDownY = 0
const DRAG_THRESHOLD = 5

canvas.addEventListener('mousedown', (e) => {
  isDragging = false
  mouseDownX = e.screenX
  mouseDownY = e.screenY
})

canvas.addEventListener('mousemove', (e) => {
  if (e.buttons !== 1 || isDragging) return
  const dx = Math.abs(e.screenX - mouseDownX)
  const dy = Math.abs(e.screenY - mouseDownY)
  if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
    isDragging = true
    window.api.petOverlayDragStart(e.clientX, e.clientY)
  }
})

document.addEventListener('mouseup', () => {
  if (isDragging) {
    window.api.petOverlayDragEnd()
  } else {
    window.api.petOverlayTogglePlay()
  }
})

canvas.addEventListener('dblclick', () => {
  window.api.petOverlayRestoreMain()
})
