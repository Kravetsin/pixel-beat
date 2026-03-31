import type { BeatEnergy } from '../composables/useBeatDetector'

export type PetState = 'sleep' | 'idle' | 'dance' | 'jump' | 'headbang'
export type PetType = 'cat' | 'ghost'

export interface PetColors {
  body: string
  dark: string
  inner: string
  eyeGlow: string
}

const PIXEL = 4

export class PetEngine {
  state: PetState = 'sleep'
  petType: PetType = 'cat'
  frame = 0
  animSpeed = 4
  scaleY = 1
  offsetX = 0
  offsetY = 0
  eyeGlow = false
  colors: PetColors = { body: '#e94560', dark: '#533483', inner: '#ff8fa3', eyeGlow: '#00ffff' }
  private time = 0
  private frameTimer = 0
  private beatPulse = 0
  private stateTimer = 0 // time in current state (prevents flickering)

  update(energy: BeatEnergy, dt: number): void {
    this.time += dt
    this.stateTimer += dt

    // State transitions with higher thresholds and minimum hold time
    let newState: PetState = this.state
    if (energy.overall === 0) {
      newState = 'sleep'
    } else if (energy.overall < 0.1) {
      newState = 'idle'
    } else if (energy.bass > 0.85 && energy.overall > 0.55) {
      newState = 'headbang'
    } else if (energy.bass > 0.65 && energy.overall > 0.45) {
      newState = 'jump'
    } else {
      newState = 'dance'
    }

    // Only switch state if held for a minimum time (prevents flickering)
    // Except sleep/idle which should be immediate
    if (newState !== this.state) {
      const minHold = (newState === 'sleep' || newState === 'idle') ? 0 : 0.15
      if (this.stateTimer >= minHold) {
        this.state = newState
        this.stateTimer = 0
      }
    }

    this.animSpeed = 2 + energy.overall * 10
    this.frameTimer += dt
    if (this.frameTimer >= 1 / this.animSpeed) {
      this.frameTimer -= 1 / this.animSpeed
      this.frame++
    }
    if (energy.isBeat) this.beatPulse = 1
    else this.beatPulse *= 0.85

    this.scaleY += (1 + this.beatPulse * 0.12 - this.scaleY) * 0.15
    this.offsetX = Math.sin(this.time * energy.mid * 5) * energy.mid * 5
    this.offsetY = -this.beatPulse * 6
    this.eyeGlow = energy.high > 0.3
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.translate(width / 2 + this.offsetX, height * 0.65 + this.offsetY)
    ctx.scale(1, this.scaleY)

    if (this.petType === 'ghost') {
      this.renderGhost(ctx)
    } else {
      this.renderCat(ctx)
    }
    ctx.restore()
  }

  private p(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.fillStyle = color
    ctx.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL)
  }

  // ===================== CAT =====================

  private renderCat(ctx: CanvasRenderingContext2D): void {
    switch (this.state) {
      case 'sleep': this.catSleep(ctx); break
      case 'idle': this.catIdle(ctx); break
      case 'dance': this.catDance(ctx); break
      case 'jump': this.catJump(ctx); break
      case 'headbang': this.catHeadbang(ctx); break
    }
  }

  private catBody(ctx: CanvasRenderingContext2D): void {
    const { body, dark } = this.colors
    for (let x = -4; x < 4; x++)
      for (let y = -3; y < 3; y++)
        this.p(ctx, x, y, body)
    this.p(ctx, -3, 3, dark); this.p(ctx, -2, 3, dark)
    this.p(ctx, 2, 3, dark); this.p(ctx, 3, 3, dark)
  }

  private catEars(ctx: CanvasRenderingContext2D, tilt = 0): void {
    const { body, inner } = this.colors
    this.p(ctx, -4 + tilt, -5, body); this.p(ctx, -3 + tilt, -5, body)
    this.p(ctx, -4 + tilt, -4, body); this.p(ctx, -3 + tilt, -4, inner)
    this.p(ctx, 2 - tilt, -5, body); this.p(ctx, 3 - tilt, -5, body)
    this.p(ctx, 3 - tilt, -4, body); this.p(ctx, 2 - tilt, -4, inner)
  }

  private catEyes(ctx: CanvasRenderingContext2D, blinking = false): void {
    const eyeColor = this.eyeGlow ? this.colors.eyeGlow : '#ffffff'
    if (blinking) {
      this.p(ctx, -2, -2, '#333'); this.p(ctx, 1, -2, '#333')
    } else {
      this.p(ctx, -2, -2, eyeColor); this.p(ctx, -2, -1, '#111')
      this.p(ctx, 1, -2, eyeColor); this.p(ctx, 1, -1, '#111')
    }
  }

  private catTail(ctx: CanvasRenderingContext2D, wag: number): void {
    const { body } = this.colors
    const w = Math.round(Math.sin(wag) * 2)
    this.p(ctx, 4, 1, body)
    this.p(ctx, 5, 0 + w, body)
    this.p(ctx, 6, -1 + w, body)
  }

  private catSleep(ctx: CanvasRenderingContext2D): void {
    this.catBody(ctx); this.catEars(ctx)
    this.p(ctx, -2, -1, '#333'); this.p(ctx, 1, -1, '#333')
    this.catTail(ctx, 0)
    const z = Math.floor(this.time * 2) % 3
    ctx.fillStyle = '#888'; ctx.font = `${PIXEL * 2}px monospace`
    ctx.fillText('z', 5 * PIXEL, (-5 - z) * PIXEL)
    if (z > 0) ctx.fillText('z', 7 * PIXEL, (-6 - z) * PIXEL)
  }

  private catIdle(ctx: CanvasRenderingContext2D): void {
    ctx.translate(0, Math.sin(this.time * 2) * 1.5)
    this.catBody(ctx); this.catEars(ctx)
    this.catEyes(ctx, Math.floor(this.time * 3) % 20 === 0)
    this.catTail(ctx, this.time * 2)
  }

  private catDance(ctx: CanvasRenderingContext2D): void {
    this.catBody(ctx)
    this.catEars(ctx, Math.round(Math.sin(this.time * 6)))
    this.catEyes(ctx); this.catTail(ctx, this.time * 6)
    const { dark } = this.colors
    if (this.frame % 2 === 0) {
      this.p(ctx, -3, 2, dark); this.p(ctx, 2, 4, dark)
    } else {
      this.p(ctx, -3, 4, dark); this.p(ctx, 2, 2, dark)
    }
  }

  private catJump(ctx: CanvasRenderingContext2D): void {
    this.catBody(ctx); this.catEars(ctx, -1)
    this.catEyes(ctx); this.catTail(ctx, this.time * 8)
    const { body } = this.colors
    this.p(ctx, -5, -2, body); this.p(ctx, -5, -3, body)
    this.p(ctx, 4, -2, body); this.p(ctx, 4, -3, body)
  }

  private catHeadbang(ctx: CanvasRenderingContext2D): void {
    const h = Math.sin(this.time * 12) * 2
    ctx.translate(0, Math.abs(h))
    this.catBody(ctx); this.catEars(ctx, Math.round(h))
    this.catEyes(ctx); this.catTail(ctx, this.time * 10)
  }

  // ===================== GHOST =====================

  private renderGhost(ctx: CanvasRenderingContext2D): void {
    switch (this.state) {
      case 'sleep': this.ghostSleep(ctx); break
      case 'idle': this.ghostIdle(ctx); break
      case 'dance': this.ghostDance(ctx); break
      case 'jump': this.ghostJump(ctx); break
      case 'headbang': this.ghostHeadbang(ctx); break
    }
  }

  private ghostBody(ctx: CanvasRenderingContext2D, squish = 0): void {
    const { body, dark } = this.colors
    // Round head
    for (let x = -3; x <= 3; x++)
      for (let y = -5; y <= -3; y++)
        this.p(ctx, x, y, body)
    this.p(ctx, -2, -6, body); this.p(ctx, -1, -6, body)
    this.p(ctx, 0, -6, body); this.p(ctx, 1, -6, body); this.p(ctx, 2, -6, body)
    // Body
    for (let x = -4; x <= 4; x++)
      for (let y = -2; y <= 3 + squish; y++)
        this.p(ctx, x, y, body)
    // Wavy bottom
    const wave = Math.sin(this.time * 4)
    for (let x = -4; x <= 4; x++) {
      const w = Math.round(Math.sin(x * 1.2 + wave * 2) * 0.8)
      this.p(ctx, x, 4 + squish + w, body)
    }
    // Dark bottom edge hints
    this.p(ctx, -3, 4 + squish, dark); this.p(ctx, 0, 4 + squish, dark); this.p(ctx, 3, 4 + squish, dark)
  }

  private ghostEyes(ctx: CanvasRenderingContext2D, blinking = false, oy = 0): void {
    const eyeColor = this.eyeGlow ? this.colors.eyeGlow : '#111111'
    if (blinking) {
      this.p(ctx, -2, -3 + oy, '#333'); this.p(ctx, 2, -3 + oy, '#333')
    } else {
      // Big round eyes
      this.p(ctx, -2, -4 + oy, eyeColor); this.p(ctx, -1, -4 + oy, eyeColor)
      this.p(ctx, -2, -3 + oy, eyeColor); this.p(ctx, -1, -3 + oy, eyeColor)
      // Right eye
      this.p(ctx, 1, -4 + oy, eyeColor); this.p(ctx, 2, -4 + oy, eyeColor)
      this.p(ctx, 1, -3 + oy, eyeColor); this.p(ctx, 2, -3 + oy, eyeColor)
      // Pupils (white shine dots)
      this.p(ctx, -2, -4 + oy, '#ffffff')
      this.p(ctx, 1, -4 + oy, '#ffffff')
    }
  }

  private ghostMouth(ctx: CanvasRenderingContext2D, open = false, oy = 0): void {
    if (open) {
      this.p(ctx, -1, -1 + oy, '#333'); this.p(ctx, 0, -1 + oy, '#333'); this.p(ctx, 1, -1 + oy, '#333')
      this.p(ctx, 0, 0 + oy, '#333')
    } else {
      this.p(ctx, -1, -1 + oy, '#333'); this.p(ctx, 0, -1 + oy, '#333'); this.p(ctx, 1, -1 + oy, '#333')
    }
  }

  private ghostCheeks(ctx: CanvasRenderingContext2D, oy = 0): void {
    const { inner } = this.colors
    this.p(ctx, -3, -2 + oy, inner); this.p(ctx, 3, -2 + oy, inner)
  }

  private ghostSleep(ctx: CanvasRenderingContext2D): void {
    const float = Math.sin(this.time * 1.5) * 2
    ctx.translate(0, float)
    this.ghostBody(ctx)
    this.ghostEyes(ctx, true)
    this.ghostMouth(ctx)
    this.ghostCheeks(ctx)
    const z = Math.floor(this.time * 2) % 3
    ctx.fillStyle = '#888'; ctx.font = `${PIXEL * 2}px monospace`
    ctx.fillText('z', 5 * PIXEL, (-7 - z) * PIXEL)
    if (z > 0) ctx.fillText('z', 7 * PIXEL, (-8 - z) * PIXEL)
  }

  private ghostIdle(ctx: CanvasRenderingContext2D): void {
    const float = Math.sin(this.time * 2) * 3
    ctx.translate(0, float)
    this.ghostBody(ctx)
    this.ghostEyes(ctx, Math.floor(this.time * 2) % 25 === 0)
    this.ghostMouth(ctx)
    this.ghostCheeks(ctx)
  }

  private ghostDance(ctx: CanvasRenderingContext2D): void {
    const float = Math.sin(this.time * 3) * 4
    const tilt = Math.sin(this.time * 5) * 0.1
    ctx.translate(0, float)
    ctx.rotate(tilt)
    this.ghostBody(ctx)
    this.ghostEyes(ctx)
    this.ghostMouth(ctx, this.frame % 4 < 2)
    this.ghostCheeks(ctx)
  }

  private ghostJump(ctx: CanvasRenderingContext2D): void {
    const float = Math.sin(this.time * 4) * 6
    ctx.translate(0, float)
    this.ghostBody(ctx, -1)
    this.ghostEyes(ctx)
    this.ghostMouth(ctx, true)
    this.ghostCheeks(ctx)
    // Little arms waving
    const { body } = this.colors
    const armWave = Math.round(Math.sin(this.time * 8))
    this.p(ctx, -5, -2 + armWave, body); this.p(ctx, -5, -1 + armWave, body)
    this.p(ctx, 5, -2 - armWave, body); this.p(ctx, 5, -1 - armWave, body)
  }

  private ghostHeadbang(ctx: CanvasRenderingContext2D): void {
    const float = Math.sin(this.time * 3) * 3
    const headDip = Math.abs(Math.sin(this.time * 10)) * 2
    ctx.translate(0, float + headDip)
    this.ghostBody(ctx)
    this.ghostEyes(ctx)
    this.ghostMouth(ctx, true)
    this.ghostCheeks(ctx)
  }
}
