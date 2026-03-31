import type { BeatEnergy } from '../composables/useBeatDetector'

export type PetState = 'sleep' | 'idle' | 'dance' | 'jump' | 'headbang'

const PIXEL = 4 // scale factor for pixel art look

export class PetEngine {
  state: PetState = 'sleep'
  frame = 0
  animSpeed = 4 // frames per second
  scaleY = 1
  offsetX = 0
  offsetY = 0
  eyeGlow = false
  private time = 0
  private frameTimer = 0
  private beatPulse = 0 // 0-1, spikes on beat

  update(energy: BeatEnergy, dt: number): void {
    this.time += dt

    // State transitions based on energy
    if (energy.overall === 0) {
      this.state = 'sleep'
    } else if (energy.overall < 0.15) {
      this.state = 'idle'
    } else if (energy.bass > 0.5 && energy.overall > 0.4) {
      this.state = energy.bass > 0.7 ? 'headbang' : 'jump'
    } else {
      this.state = 'dance'
    }

    // Animation speed driven by energy
    this.animSpeed = 2 + energy.overall * 12

    // Frame advance
    this.frameTimer += dt
    const frameDuration = 1 / this.animSpeed
    if (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration
      this.frame++
    }

    // Beat pulse (spike on beat, decay)
    if (energy.isBeat) {
      this.beatPulse = 1
    } else {
      this.beatPulse *= 0.85
    }

    // Squash & stretch on bass
    const targetScaleY = 1 + this.beatPulse * 0.12
    this.scaleY += (targetScaleY - this.scaleY) * 0.15

    // Horizontal sway driven by mid
    this.offsetX = Math.sin(this.time * energy.mid * 5) * energy.mid * 5

    // Vertical bounce on bass
    this.offsetY = -this.beatPulse * 6

    // Eye glow on high energy
    this.eyeGlow = energy.high > 0.3
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height)

    const cx = width / 2 + this.offsetX
    const cy = height * 0.65 + this.offsetY

    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, this.scaleY)

    switch (this.state) {
      case 'sleep':
        this.drawSleeping(ctx)
        break
      case 'idle':
        this.drawIdle(ctx)
        break
      case 'dance':
        this.drawDancing(ctx)
        break
      case 'jump':
        this.drawJumping(ctx)
        break
      case 'headbang':
        this.drawHeadbanging(ctx)
        break
    }

    ctx.restore()
  }

  private p(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.fillStyle = color
    ctx.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL)
  }

  private drawBody(ctx: CanvasRenderingContext2D): void {
    const c = '#e94560' // body color
    const d = '#533483' // darker shade

    // Body (8x6 block centered)
    for (let x = -4; x < 4; x++) {
      for (let y = -3; y < 3; y++) {
        this.p(ctx, x, y, c)
      }
    }

    // Feet
    this.p(ctx, -3, 3, d)
    this.p(ctx, -2, 3, d)
    this.p(ctx, 2, 3, d)
    this.p(ctx, 3, 3, d)
  }

  private drawEars(ctx: CanvasRenderingContext2D, tilt = 0): void {
    const c = '#e94560'
    const inner = '#ff8fa3'
    // Left ear
    this.p(ctx, -4 + tilt, -5, c)
    this.p(ctx, -3 + tilt, -5, c)
    this.p(ctx, -4 + tilt, -4, c)
    this.p(ctx, -3 + tilt, -4, inner)
    // Right ear
    this.p(ctx, 2 - tilt, -5, c)
    this.p(ctx, 3 - tilt, -5, c)
    this.p(ctx, 3 - tilt, -4, c)
    this.p(ctx, 2 - tilt, -4, inner)
  }

  private drawEyes(ctx: CanvasRenderingContext2D, blinking = false): void {
    const eyeColor = this.eyeGlow ? '#00ffff' : '#ffffff'
    if (blinking) {
      this.p(ctx, -2, -2, '#333')
      this.p(ctx, 1, -2, '#333')
    } else {
      this.p(ctx, -2, -2, eyeColor)
      this.p(ctx, -2, -1, '#111')
      this.p(ctx, 1, -2, eyeColor)
      this.p(ctx, 1, -1, '#111')
    }
  }

  private drawTail(ctx: CanvasRenderingContext2D, wag: number): void {
    const c = '#e94560'
    const tailX = 4
    const wave = Math.round(Math.sin(wag) * 2)
    this.p(ctx, tailX, 1, c)
    this.p(ctx, tailX + 1, 0 + wave, c)
    this.p(ctx, tailX + 2, -1 + wave, c)
  }

  private drawSleeping(ctx: CanvasRenderingContext2D): void {
    this.drawBody(ctx)
    this.drawEars(ctx)
    // Closed eyes
    this.p(ctx, -2, -1, '#333')
    this.p(ctx, 1, -1, '#333')
    this.drawTail(ctx, 0)

    // Zzz
    const zPhase = Math.floor(this.time * 2) % 3
    ctx.fillStyle = '#888'
    ctx.font = `${PIXEL * 2}px monospace`
    ctx.fillText('z', 5 * PIXEL, (-5 - zPhase) * PIXEL)
    if (zPhase > 0) ctx.fillText('z', 7 * PIXEL, (-6 - zPhase) * PIXEL)
  }

  private drawIdle(ctx: CanvasRenderingContext2D): void {
    const bob = Math.sin(this.time * 2) * 1.5
    ctx.translate(0, bob)
    this.drawBody(ctx)
    this.drawEars(ctx)
    const blinking = Math.floor(this.time * 3) % 20 === 0
    this.drawEyes(ctx, blinking)
    this.drawTail(ctx, this.time * 2)
  }

  private drawDancing(ctx: CanvasRenderingContext2D): void {
    this.drawBody(ctx)
    this.drawEars(ctx, Math.round(Math.sin(this.time * 6)))
    this.drawEyes(ctx)
    this.drawTail(ctx, this.time * 6)

    // Bouncing feet
    const step = this.frame % 2 === 0
    if (step) {
      this.p(ctx, -3, 2, '#533483')
      this.p(ctx, 2, 4, '#533483')
    } else {
      this.p(ctx, -3, 4, '#533483')
      this.p(ctx, 2, 2, '#533483')
    }
  }

  private drawJumping(ctx: CanvasRenderingContext2D): void {
    this.drawBody(ctx)
    this.drawEars(ctx, -1)
    this.drawEyes(ctx)
    this.drawTail(ctx, this.time * 8)

    // Arms up
    this.p(ctx, -5, -2, '#e94560')
    this.p(ctx, -5, -3, '#e94560')
    this.p(ctx, 4, -2, '#e94560')
    this.p(ctx, 4, -3, '#e94560')
  }

  private drawHeadbanging(ctx: CanvasRenderingContext2D): void {
    const headTilt = Math.sin(this.time * 12) * 2
    ctx.translate(0, Math.abs(headTilt))
    this.drawBody(ctx)
    this.drawEars(ctx, Math.round(headTilt))
    this.drawEyes(ctx)
    this.drawTail(ctx, this.time * 10)
  }
}
