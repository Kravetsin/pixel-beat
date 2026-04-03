import type { BeatEnergy } from '../composables/useBeatDetector'

export type PetState = 'sleep' | 'idle' | 'dance' | 'jump' | 'headbang' | 'fire' | 'falling-asleep' | 'waking-up'
export type PetType = 'cat' | 'ghost' | 'claude'

export interface PetColors {
  body: string
  dark: string
  inner: string
  eyeGlow: string
}

const P = 4

// Darken a hex color
function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '')
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) - amt)
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) - amt)
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) - amt)
  return `rgb(${r},${g},${b})`
}

function tint(hex: string, amt: number): string {
  const h = hex.replace('#', '')
  const r = Math.min(255, parseInt(h.slice(0, 2), 16) + amt)
  const g = Math.min(255, parseInt(h.slice(2, 4), 16) + amt)
  const b = Math.min(255, parseInt(h.slice(4, 6), 16) + amt)
  return `rgb(${r},${g},${b})`
}

export class PetEngine {
  state: PetState = 'sleep'
  petType: PetType = 'cat'
  frame = 0
  animSpeed = 4
  scaleX = 1
  scaleY = 1
  offsetX = 0
  offsetY = 0
  eyeGlow = false
  vocalActive = false
  colors: PetColors = { body: '#e94560', dark: '#533483', inner: '#ff8fa3', eyeGlow: '#00ffff' }
  private time = 0
  private frameTimer = 0
  private beatPulse = 0
  private snarePulse = 0
  private stateTimer = 0
  private bassSustainTime = 0
  private sleepSubState: 'sleeping' | 'waking-wave' | 'waking-music' = 'sleeping'
  private sleepWakeTimer = 0
  private sleepWakeDuration = 0
  private sleepWakeTarget = 10

  update(energy: BeatEnergy, dt: number): void {
    this.time += dt
    this.stateTimer += dt

    // Track kick sustain for fire state
    if (energy.kick > 0.7 && energy.overall > 0.5) {
      this.bassSustainTime += dt
    } else {
      this.bassSustainTime = Math.max(0, this.bassSustainTime - dt * 2)
    }

    let newState: PetState = this.state

    if (this.state === 'falling-asleep') {
      // Transition completes after 1.5s
      if (this.stateTimer >= 1.5) {
        newState = energy.overall === 0 ? 'sleep' : 'waking-up'
      }
    } else if (this.state === 'waking-up') {
      // Transition completes after 1.0s
      if (this.stateTimer >= 1.0) {
        if (energy.overall === 0) newState = 'falling-asleep'
        else if (energy.overall < 0.1) newState = 'idle'
        else if (this.bassSustainTime > 3.0 && energy.kick > 0.75) newState = 'fire'
        else if (energy.kick > 0.8 && energy.overall > 0.5) newState = 'headbang'
        else if (energy.kick > 0.5 && energy.bass > 0.4) newState = 'jump'
        else newState = 'dance'
      }
    } else {
      // Normal energy-based state
      if (energy.overall === 0) newState = 'sleep'
      else if (energy.overall < 0.1) newState = 'idle'
      else if (this.bassSustainTime > 3.0 && energy.bass > 0.85) newState = 'fire'
      else if (energy.bass > 0.9 && energy.overall > 0.6) newState = 'headbang'
      else if (energy.bass > 0.7 && energy.overall > 0.5) newState = 'jump'
      else newState = 'dance'

      // Intercept: smooth transition to/from sleep
      if (newState === 'sleep' && this.state !== 'sleep') {
        newState = 'falling-asleep'
      } else if (this.state === 'sleep' && newState !== 'sleep') {
        newState = 'waking-up'
      }
    }

    if (newState !== this.state) {
      const noHold = newState === 'sleep' || newState === 'idle'
        || newState === 'falling-asleep' || newState === 'waking-up'
      const minHold = noHold ? 0 : 0.15
      if (this.stateTimer >= minHold) {
        if (newState === 'sleep') {
          this.sleepSubState = 'sleeping'
          this.sleepWakeTimer = 0
          this.sleepWakeTarget = 8 + Math.random() * 7
        }
        this.state = newState
        this.stateTimer = 0
      }
    }

    if (this.state === 'sleep') {
      if (this.sleepSubState === 'sleeping') {
        this.sleepWakeTimer += dt
        if (this.sleepWakeTimer >= this.sleepWakeTarget) {
          this.sleepSubState = Math.random() < 0.5 ? 'waking-wave' : 'waking-music'
          this.sleepWakeDuration = 0
        }
      } else {
        this.sleepWakeDuration += dt
        if (this.sleepWakeDuration >= 2.5) {
          this.sleepSubState = 'sleeping'
          this.sleepWakeTimer = 0
          this.sleepWakeTarget = 8 + Math.random() * 7
        }
      }
    }

    this.animSpeed = 2 + energy.overall * 10
    this.frameTimer += dt
    if (this.frameTimer >= 1 / this.animSpeed) {
      this.frameTimer -= 1 / this.animSpeed
      this.frame++
    }
    if (energy.isKickHit) this.beatPulse = 1
    else this.beatPulse *= 0.85
    if (energy.isSnareHit) this.snarePulse = 1
    else this.snarePulse *= 0.82

    // Blend factor: dampen energy-driven movement during transitions
    let blend = 1
    if (this.state === 'falling-asleep') {
      blend = 1 - Math.min(1, this.stateTimer / 1.5)
    } else if (this.state === 'waking-up') {
      blend = Math.min(1, this.stateTimer / 1.0)
    } else if (this.state === 'sleep') {
      blend = 0
    }

    this.scaleY += (1 + this.beatPulse * 0.2 * blend - this.scaleY) * 0.2
    this.scaleX += (1 + this.snarePulse * 0.18 * blend - this.scaleX) * 0.2
    this.offsetX = Math.sin(this.time * energy.vocal * 4) * energy.vocal * 4 * blend
    this.offsetY = -this.beatPulse * 10 * blend
    this.eyeGlow = energy.high > 0.25 && blend > 0.5
    this.vocalActive = energy.vocalRaw > 0.2
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.translate(width / 2 + this.offsetX, height * 0.6 + this.offsetY)
    ctx.scale(this.scaleX, this.scaleY)

    if (this.petType === 'ghost') this.renderGhost(ctx)
    else if (this.petType === 'claude') this.renderClaude(ctx)
    else this.renderCat(ctx)

    ctx.restore()
  }

  // Shared pixel draw
  private d(ctx: CanvasRenderingContext2D, x: number, y: number, c: string): void {
    ctx.fillStyle = c
    ctx.fillRect(x * P, y * P, P, P)
  }

  // Shared: 2x2 eye with highlight
  private drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, _outline: string): void {
    const eyeColor = this.eyeGlow ? this.colors.eyeGlow : '#ffffff'
    this.d(ctx, x, y, eyeColor)
    this.d(ctx, x + 1, y, eyeColor)
    this.d(ctx, x, y + 1, '#111111')
    this.d(ctx, x + 1, y + 1, eyeColor)
    // Highlight
    this.d(ctx, x, y, '#ffffff')
  }

  private drawClosedEye(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    outline: string
  ): void {
    this.d(ctx, x, y + 1, outline)
    this.d(ctx, x + 1, y + 1, outline)
  }

  private drawBlush(ctx: CanvasRenderingContext2D, lx: number, rx: number, y: number): void {
    const { inner } = this.colors
    this.d(ctx, lx, y, inner)
    this.d(ctx, rx, y, inner)
  }

  private drawZzz(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    const phase = Math.floor(this.time * 2) % 3
    ctx.fillStyle = '#888888'
    ctx.font = `${P * 2}px monospace`
    ctx.fillText('z', ox * P, (oy - phase) * P)
    if (phase > 0) ctx.fillText('z', (ox + 2) * P, (oy - 2 - phase) * P)
  }

  private drawMusicBubble(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    const t = this.sleepWakeDuration
    const alpha = t < 0.5 ? t / 0.5 : t > 2.0 ? Math.max(0, 1 - (t - 2.0) / 0.3) : 1
    ctx.globalAlpha = alpha

    const bg = '#ffffff'
    const border = '#888888'
    const note = '#333333'

    // Bubble border
    for (let x = 1; x <= 5; x++) this.d(ctx, ox + x, oy, border)
    for (let x = 1; x <= 5; x++) this.d(ctx, ox + x, oy + 5, border)
    for (let y = 1; y <= 4; y++) this.d(ctx, ox, oy + y, border)
    for (let y = 1; y <= 4; y++) this.d(ctx, ox + 6, oy + y, border)
    // Bubble fill
    for (let x = 1; x <= 5; x++) for (let y = 1; y <= 4; y++) this.d(ctx, ox + x, oy + y, bg)
    // Speech tail
    this.d(ctx, ox + 1, oy + 6, border)
    this.d(ctx, ox, oy + 7, border)

    // Music note (eighth note)
    this.d(ctx, ox + 4, oy + 1, note)
    this.d(ctx, ox + 4, oy + 2, note)
    this.d(ctx, ox + 4, oy + 3, note)
    this.d(ctx, ox + 5, oy + 1, note)
    this.d(ctx, ox + 5, oy + 2, note)
    this.d(ctx, ox + 3, oy + 3, note)
    this.d(ctx, ox + 3, oy + 4, note)
    this.d(ctx, ox + 4, oy + 4, note)

    ctx.globalAlpha = 1
  }

  // ===================== CAT =====================

  private renderCat(ctx: CanvasRenderingContext2D): void {
    const s = this.state
    if (s === 'sleep') this.catSleep(ctx)
    else if (s === 'falling-asleep') this.catFallingAsleep(ctx)
    else if (s === 'waking-up') this.catWakingUp(ctx)
    else if (s === 'idle') this.catIdle(ctx)
    else if (s === 'dance') this.catDance(ctx)
    else if (s === 'jump') this.catJump(ctx)
    else if (s === 'fire') this.catFire(ctx)
    else this.catHeadbang(ctx)
  }

  private catDraw(
    ctx: CanvasRenderingContext2D,
    opts: {
      blink?: boolean
      earTilt?: number
      tailWag?: number
      legOff?: number
      armsUp?: boolean
      armWave?: number
      mouthOpen?: boolean
    } = {}
  ): void {
    const { body, dark, inner } = this.colors
    const outline = shade(body, 80)
    const light = tint(body, 50)
    const et = opts.earTilt ?? 0

    // Tail (behind body)
    const tw = Math.round(Math.sin(opts.tailWag ?? 0) * 2)
    this.d(ctx, 5, 2, body)
    this.d(ctx, 6, 1 + tw, body)
    this.d(ctx, 7, 0 + tw, body)
    this.d(ctx, 7, -1 + tw, outline)

    // Body (wider, rounded)
    for (let x = -4; x <= 4; x++) for (let y = 1; y <= 5; y++) this.d(ctx, x, y, body)
    for (let x = -3; x <= 3; x++) this.d(ctx, x, 6, body)
    // Belly
    for (let x = -2; x <= 2; x++) for (let y = 3; y <= 5; y++) this.d(ctx, x, y, light)

    // Head (big, round — chibi)
    for (let x = -5; x <= 5; x++) for (let y = -4; y <= 1; y++) this.d(ctx, x, y, body)
    for (let x = -4; x <= 4; x++) this.d(ctx, x, -5, body)
    for (let x = -3; x <= 3; x++) this.d(ctx, x, -6, body)

    // Ears (triangles)
    this.d(ctx, -5 + et, -6, body)
    this.d(ctx, -4 + et, -7, body)
    this.d(ctx, -5 + et, -7, body)
    this.d(ctx, -4 + et, -8, outline)
    this.d(ctx, -5 + et, -8, body)
    this.d(ctx, -4 + et, -7, inner) // inner ear
    this.d(ctx, 5 - et, -6, body)
    this.d(ctx, 4 - et, -7, body)
    this.d(ctx, 5 - et, -7, body)
    this.d(ctx, 4 - et, -8, outline)
    this.d(ctx, 5 - et, -8, body)
    this.d(ctx, 4 - et, -7, inner) // inner ear

    // Eyes (2x2, in lower half of head)
    if (opts.blink) {
      this.drawClosedEye(ctx, -4, -2, outline)
      this.drawClosedEye(ctx, 2, -2, outline)
    } else {
      this.drawEye(ctx, -4, -2, outline)
      this.drawEye(ctx, 2, -2, outline)
    }

    // Nose (tiny, centered)
    this.d(ctx, 0, 0, outline)

    // Mouth
    if (opts.mouthOpen) {
      this.d(ctx, -1, 1, outline)
      this.d(ctx, 0, 1, dark)
      this.d(ctx, 1, 1, outline)
    }

    // Cheek blush
    this.drawBlush(ctx, -5, 4, -1)

    // Legs
    const lo = Math.round(opts.legOff ?? 0)
    this.d(ctx, -3, 7 + lo, outline)
    this.d(ctx, -2, 7 + lo, outline)
    this.d(ctx, 2, 7 - lo, outline)
    this.d(ctx, 3, 7 - lo, outline)

    // Arms up (static)
    if (opts.armsUp) {
      this.d(ctx, -5, 1, body)
      this.d(ctx, -5, 0, body)
      this.d(ctx, -5, -1, body)
      this.d(ctx, 5, 1, body)
      this.d(ctx, 5, 0, body)
      this.d(ctx, 5, -1, body)
    }

    // Arms waving (animated)
    if (opts.armWave !== undefined) {
      const aw = Math.round(Math.sin(opts.armWave) * 2)
      this.d(ctx, -5, 2, body)
      this.d(ctx, -6, 1 + aw, body)
      this.d(ctx, -6, 0 + aw, body)
      this.d(ctx, 5, 2, body)
      this.d(ctx, 6, 1 - aw, body)
      this.d(ctx, 6, 0 - aw, body)
    }
  }

  private catSleep(ctx: CanvasRenderingContext2D): void {
    if (this.sleepSubState === 'sleeping') {
      this.catDraw(ctx, { blink: true, tailWag: 0 })
      this.drawZzz(ctx, 6, -7)
    } else if (this.sleepSubState === 'waking-wave') {
      const t = this.sleepWakeDuration
      const eyesOpen = t > 0.4 && t < 2.0
      this.catDraw(ctx, {
        blink: !eyesOpen,
        tailWag: this.time * 2,
        armWave: this.time * 4
      })
    } else {
      const t = this.sleepWakeDuration
      const eyesOpen = t > 0.4 && t < 2.0
      this.catDraw(ctx, { blink: !eyesOpen, tailWag: this.time * 2 })
      if (t > 0.3 && t < 2.2) {
        this.drawMusicBubble(ctx, 7, -10)
      }
    }
  }

  private catFallingAsleep(ctx: CanvasRenderingContext2D): void {
    const p = Math.min(1, this.stateTimer / 1.5)
    ctx.translate(0, p * 3)
    this.catDraw(ctx, {
      blink: p > 0.5,
      mouthOpen: p < 0.35,
      tailWag: this.stateTimer * (2 - p * 2)
    })
    if (p > 0.7) this.drawZzz(ctx, 6, -7)
  }

  private catWakingUp(ctx: CanvasRenderingContext2D): void {
    const p = Math.min(1, this.stateTimer / 1.0)
    ctx.translate(0, (1 - p) * 3)
    this.catDraw(ctx, {
      blink: p < 0.3,
      tailWag: this.stateTimer * 2,
      armWave: p > 0.4 ? this.stateTimer * 3 : undefined
    })
  }

  private catIdle(ctx: CanvasRenderingContext2D): void {
    ctx.translate(0, Math.sin(this.time * 2) * 1.5)
    this.catDraw(ctx, {
      blink: Math.floor(this.time * 2) % 25 === 0,
      tailWag: this.time * 2
    })
  }

  private catDance(ctx: CanvasRenderingContext2D): void {
    this.catDraw(ctx, {
      earTilt: Math.round(Math.sin(this.time * 6)),
      tailWag: this.time * 6,
      legOff: Math.sin(this.time * 8),
      armWave: this.time * 6,
      mouthOpen: this.vocalActive
    })
  }

  private catJump(ctx: CanvasRenderingContext2D): void {
    this.catDraw(ctx, {
      earTilt: -1,
      tailWag: this.time * 8,
      armsUp: true,
      mouthOpen: true
    })
  }

  private catHeadbang(ctx: CanvasRenderingContext2D): void {
    const dip = Math.abs(Math.sin(this.time * 10)) * 2
    ctx.translate(0, dip)
    this.catDraw(ctx, {
      earTilt: Math.round(Math.sin(this.time * 10)),
      tailWag: this.time * 10,
      mouthOpen: true
    })
  }

  private catFire(ctx: CanvasRenderingContext2D): void {
    const { body, dark, inner } = this.colors
    const outline = shade(body, 80)
    const shake = Math.round(Math.sin(this.time * 15) * 1)
    const firePhase = Math.floor(this.time * 8) % 4

    ctx.translate(shake, Math.abs(Math.sin(this.time * 8)) * -3)

    // Tail
    const tw = Math.round(Math.sin(this.time * 15) * 2)
    this.d(ctx, 5, 2, body)
    this.d(ctx, 6, 1 + tw, body)
    this.d(ctx, 7, 0 + tw, body)
    this.d(ctx, 7, -1 + tw, outline)

    // Body
    for (let x = -4; x <= 4; x++) for (let y = 1; y <= 5; y++) this.d(ctx, x, y, body)
    for (let x = -3; x <= 3; x++) this.d(ctx, x, 6, body)
    for (let x = -2; x <= 2; x++) for (let y = 3; y <= 5; y++) this.d(ctx, x, y, tint(body, 50))

    // Head
    for (let x = -5; x <= 5; x++) for (let y = -4; y <= 1; y++) this.d(ctx, x, y, body)
    for (let x = -4; x <= 4; x++) this.d(ctx, x, -5, body)
    for (let x = -3; x <= 3; x++) this.d(ctx, x, -6, body)

    // Ears
    const et = Math.round(Math.sin(this.time * 12))
    this.d(ctx, -5 + et, -6, body)
    this.d(ctx, -4 + et, -7, body)
    this.d(ctx, -5 + et, -7, body)
    this.d(ctx, -4 + et, -8, outline)
    this.d(ctx, -5 + et, -8, body)
    this.d(ctx, -4 + et, -7, inner)
    this.d(ctx, 5 - et, -6, body)
    this.d(ctx, 4 - et, -7, body)
    this.d(ctx, 5 - et, -7, body)
    this.d(ctx, 4 - et, -8, outline)
    this.d(ctx, 5 - et, -8, body)
    this.d(ctx, 4 - et, -7, inner)

    // Eyes (excited)
    this.drawEye(ctx, -4, -2, outline)
    this.drawEye(ctx, 2, -2, outline)

    // Nose
    this.d(ctx, 0, 0, outline)

    // Mouth open
    this.d(ctx, -1, 1, outline)
    this.d(ctx, 0, 1, dark)
    this.d(ctx, 1, 1, outline)

    // Blush
    this.drawBlush(ctx, -5, 4, -1)

    // Legs
    const lo = Math.round(Math.sin(this.time * 8))
    this.d(ctx, -3, 7 + lo, outline)
    this.d(ctx, -2, 7 + lo, outline)
    this.d(ctx, 2, 7 - lo, outline)
    this.d(ctx, 3, 7 - lo, outline)

    // Arms diagonal up with open palms
    // Left arm: goes up-left diagonally
    this.d(ctx, -5, 1, body)
    this.d(ctx, -6, 0, body)
    this.d(ctx, -7, -1, body)
    this.d(ctx, -8, -2, body)
    // Left palm (open, 2x2)
    this.d(ctx, -8, -3, body)
    this.d(ctx, -9, -3, body)
    this.d(ctx, -8, -4, body)
    this.d(ctx, -9, -4, body)

    // Right arm: goes up-right diagonally
    this.d(ctx, 5, 1, body)
    this.d(ctx, 6, 0, body)
    this.d(ctx, 7, -1, body)
    this.d(ctx, 8, -2, body)
    // Right palm (open, 2x2)
    this.d(ctx, 8, -3, body)
    this.d(ctx, 9, -3, body)
    this.d(ctx, 8, -4, body)
    this.d(ctx, 9, -4, body)

    // Fire on left palm (animated, pixel style)
    const fireColors = ['#ff4500', '#ff6b00', '#ffaa00', '#ffd700']
    if (firePhase === 0) {
      this.d(ctx, -9, -5, fireColors[0])
      this.d(ctx, -8, -5, fireColors[1])
      this.d(ctx, -9, -6, fireColors[2])
    } else if (firePhase === 1) {
      this.d(ctx, -9, -5, fireColors[1])
      this.d(ctx, -8, -5, fireColors[2])
      this.d(ctx, -9, -6, fireColors[3])
      this.d(ctx, -8, -6, fireColors[0])
    } else if (firePhase === 2) {
      this.d(ctx, -9, -5, fireColors[2])
      this.d(ctx, -8, -5, fireColors[3])
      this.d(ctx, -9, -6, fireColors[0])
      this.d(ctx, -8, -6, fireColors[1])
      this.d(ctx, -9, -7, fireColors[3])
    } else {
      this.d(ctx, -9, -5, fireColors[3])
      this.d(ctx, -8, -5, fireColors[0])
      this.d(ctx, -9, -6, fireColors[1])
      this.d(ctx, -8, -6, fireColors[2])
    }

    // Fire on right palm (animated, pixel style)
    if (firePhase === 0) {
      this.d(ctx, 8, -5, fireColors[0])
      this.d(ctx, 9, -5, fireColors[1])
      this.d(ctx, 8, -6, fireColors[2])
    } else if (firePhase === 1) {
      this.d(ctx, 8, -5, fireColors[1])
      this.d(ctx, 9, -5, fireColors[2])
      this.d(ctx, 8, -6, fireColors[3])
      this.d(ctx, 9, -6, fireColors[0])
    } else if (firePhase === 2) {
      this.d(ctx, 8, -5, fireColors[2])
      this.d(ctx, 9, -5, fireColors[3])
      this.d(ctx, 8, -6, fireColors[0])
      this.d(ctx, 9, -6, fireColors[1])
      this.d(ctx, 8, -7, fireColors[3])
    } else {
      this.d(ctx, 8, -5, fireColors[3])
      this.d(ctx, 9, -5, fireColors[0])
      this.d(ctx, 8, -6, fireColors[1])
      this.d(ctx, 9, -6, fireColors[2])
    }
  }

  // ===================== JELLYFISH =====================

  private renderGhost(ctx: CanvasRenderingContext2D): void {
    const s = this.state
    if (s === 'sleep') this.jellySleep(ctx)
    else if (s === 'falling-asleep') this.jellyFallingAsleep(ctx)
    else if (s === 'waking-up') this.jellyWakingUp(ctx)
    else if (s === 'idle') this.jellyIdle(ctx)
    else if (s === 'dance') this.jellyDance(ctx)
    else if (s === 'jump') this.jellyJump(ctx)
    else if (s === 'fire') this.jellyFire(ctx)
    else this.jellyHeadbang(ctx)
  }

  private jellyDraw(
    ctx: CanvasRenderingContext2D,
    opts: {
      blink?: boolean
      mouthOpen?: boolean
      tentacleSpeed?: number
      pulse?: number
    } = {}
  ): void {
    const { body, dark, inner } = this.colors
    const outline = shade(body, 60)
    const light = tint(body, 60)
    const ps = opts.pulse ?? 0

    // Dome / bell (rounded top, flat bottom)
    for (let x = -3; x <= 3; x++) this.d(ctx, x, -7 - ps, body)
    for (let x = -4; x <= 4; x++) for (let y = -6 - ps; y <= -4; y++) this.d(ctx, x, y, body)
    for (let x = -5; x <= 5; x++) for (let y = -3; y <= 0; y++) this.d(ctx, x, y, body)

    // Bell highlight
    for (let x = -2; x <= 2; x++) for (let y = -5 - ps; y <= -3; y++) this.d(ctx, x, y, light)

    // Bell rim
    for (let x = -5; x <= 5; x++) this.d(ctx, x, 1, outline)

    // Eyes (2x2 in lower bell)
    if (opts.blink) {
      this.drawClosedEye(ctx, -3, -2, outline)
      this.drawClosedEye(ctx, 1, -2, outline)
    } else {
      this.drawEye(ctx, -3, -2, outline)
      this.drawEye(ctx, 1, -2, outline)
    }

    // Mouth
    if (opts.mouthOpen) {
      this.d(ctx, -1, 0, outline)
      this.d(ctx, 0, 0, dark)
      this.d(ctx, 1, 0, outline)
    }

    // Blush
    this.drawBlush(ctx, -4, 3, -1)

    // Tentacles (wavy, flowing down from bell rim)
    const ts = opts.tentacleSpeed ?? this.time * 3
    for (let i = -4; i <= 4; i += 2) {
      for (let j = 0; j < 4; j++) {
        const wx = Math.round(Math.sin(ts + i + j * 1.2) * 1)
        this.d(ctx, i + wx, 2 + j, j < 2 ? body : outline)
      }
    }
    // Two longer center tentacles
    for (let j = 0; j < 6; j++) {
      const wx = Math.round(Math.sin(ts + j * 0.9) * 1)
      this.d(ctx, -1 + wx, 2 + j, j < 3 ? inner : outline)
      this.d(ctx, 1 + wx, 2 + j, j < 3 ? inner : outline)
    }
  }

  private jellySleep(ctx: CanvasRenderingContext2D): void {
    ctx.translate(0, Math.sin(this.time * 1) * 2)
    if (this.sleepSubState === 'sleeping') {
      this.jellyDraw(ctx, { blink: true, tentacleSpeed: this.time * 1 })
      this.drawZzz(ctx, 6, -9)
    } else if (this.sleepSubState === 'waking-wave') {
      const t = this.sleepWakeDuration
      const eyesOpen = t > 0.4 && t < 2.0
      this.jellyDraw(ctx, {
        blink: !eyesOpen,
        tentacleSpeed: this.time * 4,
        pulse: Math.round(Math.sin(this.time * 3) * 1)
      })
    } else {
      const t = this.sleepWakeDuration
      const eyesOpen = t > 0.4 && t < 2.0
      this.jellyDraw(ctx, { blink: !eyesOpen, tentacleSpeed: this.time * 1 })
      if (t > 0.3 && t < 2.2) {
        this.drawMusicBubble(ctx, 6, -11)
      }
    }
  }

  private jellyFallingAsleep(ctx: CanvasRenderingContext2D): void {
    const p = Math.min(1, this.stateTimer / 1.5)
    ctx.translate(0, Math.sin(this.stateTimer * 1.5) * (2 - p * 2) + p * 2)
    this.jellyDraw(ctx, {
      blink: p > 0.5,
      tentacleSpeed: this.stateTimer * (2 - p * 1.5),
      pulse: Math.round((1 - p) * Math.max(0, Math.sin(this.stateTimer * 2)))
    })
    if (p > 0.7) this.drawZzz(ctx, 6, -9)
  }

  private jellyWakingUp(ctx: CanvasRenderingContext2D): void {
    const p = Math.min(1, this.stateTimer / 1.0)
    ctx.translate(0, Math.sin(this.stateTimer * 2) * (2 + p * 3))
    this.jellyDraw(ctx, {
      blink: p < 0.3,
      tentacleSpeed: this.stateTimer * (1 + p * 2),
      pulse: Math.round(p * Math.max(0, Math.sin(this.stateTimer * 2)))
    })
  }

  private jellyIdle(ctx: CanvasRenderingContext2D): void {
    ctx.translate(0, Math.sin(this.time * 1.5) * 4)
    const pulse = Math.max(0, Math.sin(this.time * 1.5)) * 1
    this.jellyDraw(ctx, {
      blink: Math.floor(this.time * 2) % 25 === 0,
      tentacleSpeed: this.time * 2,
      pulse: Math.round(pulse)
    })
  }

  private jellyDance(ctx: CanvasRenderingContext2D): void {
    ctx.translate(0, Math.sin(this.time * 3) * 5)
    ctx.rotate(Math.sin(this.time * 4) * 0.1)
    const pulse = Math.max(0, Math.sin(this.time * 3)) * 2
    this.jellyDraw(ctx, {
      mouthOpen: this.vocalActive,
      tentacleSpeed: this.time * 5,
      pulse: Math.round(pulse)
    })
  }

  private jellyJump(ctx: CanvasRenderingContext2D): void {
    ctx.translate(0, Math.sin(this.time * 4) * 8)
    this.jellyDraw(ctx, {
      mouthOpen: true,
      tentacleSpeed: this.time * 8,
      pulse: 2
    })
  }

  private jellyHeadbang(ctx: CanvasRenderingContext2D): void {
    const bob = Math.sin(this.time * 3) * 3 + Math.abs(Math.sin(this.time * 10)) * 2
    ctx.translate(0, bob)
    this.jellyDraw(ctx, {
      mouthOpen: true,
      tentacleSpeed: this.time * 10,
      pulse: Math.round(Math.abs(Math.sin(this.time * 10)))
    })
  }

  private jellyFire(ctx: CanvasRenderingContext2D): void {
    const { body, dark, inner } = this.colors
    const outline = shade(body, 60)
    const light = tint(body, 60)
    const bob = Math.sin(this.time * 4) * 6
    const glow = Math.max(0, Math.sin(this.time * 8)) * 2
    const firePhase = Math.floor(this.time * 8) % 4
    const fireColors = ['#ff4500', '#ff6b00', '#ffaa00', '#ffd700']

    ctx.translate(0, bob)

    // Dome / bell
    for (let x = -3; x <= 3; x++) this.d(ctx, x, -7 - glow, body)
    for (let x = -4; x <= 4; x++) for (let y = -6 - glow; y <= -4; y++) this.d(ctx, x, y, body)
    for (let x = -5; x <= 5; x++) for (let y = -3; y <= 0; y++) this.d(ctx, x, y, body)

    // Bell highlight
    for (let x = -2; x <= 2; x++) for (let y = -5 - glow; y <= -3; y++) this.d(ctx, x, y, light)

    // Bell rim
    for (let x = -5; x <= 5; x++) this.d(ctx, x, 1, outline)

    // Eyes
    this.drawEye(ctx, -3, -2, outline)
    this.drawEye(ctx, 1, -2, outline)

    // Mouth open
    this.d(ctx, -1, 0, outline)
    this.d(ctx, 0, 0, dark)
    this.d(ctx, 1, 0, outline)

    // Blush
    this.drawBlush(ctx, -4, 3, -1)

    // Tentacles (more energetic)
    const ts = this.time * 12
    for (let i = -4; i <= 4; i += 2) {
      for (let j = 0; j < 4; j++) {
        const wx = Math.round(Math.sin(ts + i + j * 1.2) * 1)
        this.d(ctx, i + wx, 2 + j, j < 2 ? body : outline)
      }
    }
    for (let j = 0; j < 6; j++) {
      const wx = Math.round(Math.sin(ts + j * 0.9) * 1)
      this.d(ctx, -1 + wx, 2 + j, j < 3 ? inner : outline)
      this.d(ctx, 1 + wx, 2 + j, j < 3 ? inner : outline)
    }

    // Fire on tentacle tips (left side)
    if (firePhase === 0) {
      this.d(ctx, -4, 7, fireColors[0])
      this.d(ctx, -2, 7, fireColors[1])
      this.d(ctx, -3, 8, fireColors[2])
    } else if (firePhase === 1) {
      this.d(ctx, -4, 7, fireColors[1])
      this.d(ctx, -2, 7, fireColors[2])
      this.d(ctx, -3, 8, fireColors[3])
      this.d(ctx, -4, 8, fireColors[0])
    } else if (firePhase === 2) {
      this.d(ctx, -4, 7, fireColors[2])
      this.d(ctx, -2, 7, fireColors[3])
      this.d(ctx, -3, 8, fireColors[0])
      this.d(ctx, -4, 8, fireColors[1])
      this.d(ctx, -3, 9, fireColors[3])
    } else {
      this.d(ctx, -4, 7, fireColors[3])
      this.d(ctx, -2, 7, fireColors[0])
      this.d(ctx, -3, 8, fireColors[1])
      this.d(ctx, -4, 8, fireColors[2])
    }

    // Fire on tentacle tips (right side)
    if (firePhase === 0) {
      this.d(ctx, 2, 7, fireColors[0])
      this.d(ctx, 4, 7, fireColors[1])
      this.d(ctx, 3, 8, fireColors[2])
    } else if (firePhase === 1) {
      this.d(ctx, 2, 7, fireColors[1])
      this.d(ctx, 4, 7, fireColors[2])
      this.d(ctx, 3, 8, fireColors[3])
      this.d(ctx, 4, 8, fireColors[0])
    } else if (firePhase === 2) {
      this.d(ctx, 2, 7, fireColors[2])
      this.d(ctx, 4, 7, fireColors[3])
      this.d(ctx, 3, 8, fireColors[0])
      this.d(ctx, 4, 8, fireColors[1])
      this.d(ctx, 3, 9, fireColors[3])
    } else {
      this.d(ctx, 2, 7, fireColors[3])
      this.d(ctx, 4, 7, fireColors[0])
      this.d(ctx, 3, 8, fireColors[1])
      this.d(ctx, 4, 8, fireColors[2])
    }

    // Fire on center tentacles
    if (firePhase < 2) {
      this.d(ctx, -1, 9, fireColors[firePhase])
      this.d(ctx, 1, 9, fireColors[firePhase + 1])
    } else {
      this.d(ctx, -1, 9, fireColors[firePhase])
      this.d(ctx, 1, 9, fireColors[firePhase - 1])
    }
  }

  // ===================== ROBOT =====================

  private renderClaude(ctx: CanvasRenderingContext2D): void {
    const s = this.state
    if (s === 'sleep') this.robotSleep(ctx)
    else if (s === 'falling-asleep') this.robotFallingAsleep(ctx)
    else if (s === 'waking-up') this.robotWakingUp(ctx)
    else if (s === 'idle') this.robotIdle(ctx)
    else if (s === 'dance') this.robotDance(ctx)
    else if (s === 'jump') this.robotJump(ctx)
    else if (s === 'fire') this.robotFire(ctx)
    else this.robotHeadbang(ctx)
  }

  private robotDraw(
    ctx: CanvasRenderingContext2D,
    opts: {
      blink?: boolean
      mouthOpen?: boolean
      armWave?: number
      armsUp?: boolean
      legOff?: number
      antennaBob?: number
      coreGlow?: boolean
    } = {}
  ): void {
    const { body, dark, inner } = this.colors
    const outline = shade(body, 80)
    const light = tint(body, 50)
    const visor = shade(body, 50)

    // --- Antenna ---
    const bob = Math.round(Math.sin(opts.antennaBob ?? 0) * 1)
    this.d(ctx, 0, -9, outline) // stalk
    this.d(ctx, -1, -10 + bob, inner) // ball left
    this.d(ctx, 0, -10 + bob, inner) // ball right
    this.d(ctx, -1, -11 + bob, inner) // ball top-left
    this.d(ctx, 0, -11 + bob, inner) // ball top-right

    // --- Head (square robot head) ---
    for (let x = -5; x <= 5; x++) for (let y = -8; y <= 0; y++) this.d(ctx, x, y, body)

    // --- Visor (horizontal eye strip) ---
    for (let x = -4; x <= 4; x++) for (let y = -6; y <= -4; y++) this.d(ctx, x, y, visor)

    // LED eyes in visor
    const ledColor = this.eyeGlow ? this.colors.eyeGlow : '#ffffff'
    if (opts.blink) {
      // Off — dim horizontal line
      this.d(ctx, -3, -5, outline)
      this.d(ctx, -2, -5, outline)
      this.d(ctx, 2, -5, outline)
      this.d(ctx, 3, -5, outline)
    } else {
      // On — solid 2x2 LED blocks
      this.d(ctx, -3, -6, ledColor)
      this.d(ctx, -2, -6, ledColor)
      this.d(ctx, -3, -5, ledColor)
      this.d(ctx, -2, -5, ledColor)
      this.d(ctx, 2, -6, ledColor)
      this.d(ctx, 3, -6, ledColor)
      this.d(ctx, 2, -5, ledColor)
      this.d(ctx, 3, -5, ledColor)
    }

    // Ear bolts (side of head)
    this.d(ctx, -6, -5, outline)
    this.d(ctx, -6, -4, outline)
    this.d(ctx, 6, -5, outline)
    this.d(ctx, 6, -4, outline)

    // Mouth (speaker grille)
    if (opts.mouthOpen) {
      for (let x = -2; x <= 2; x++) this.d(ctx, x, -1, outline)
      this.d(ctx, -1, -2, outline)
      this.d(ctx, 0, -2, dark)
      this.d(ctx, 1, -2, outline)
    }

    // --- Body (boxy, smaller than head) ---
    for (let x = -3; x <= 3; x++) for (let y = 1; y <= 5; y++) this.d(ctx, x, y, body)
    for (let x = -2; x <= 2; x++) this.d(ctx, x, 6, body)

    // Chest panel (lighter inset)
    for (let x = -2; x <= 2; x++) for (let y = 2; y <= 4; y++) this.d(ctx, x, y, light)

    // Core (center of chest — glows with music)
    this.d(ctx, 0, 3, opts.coreGlow ? this.colors.eyeGlow : inner)

    // Body rivets
    this.d(ctx, -3, 1, outline)
    this.d(ctx, 3, 1, outline)
    this.d(ctx, -3, 5, outline)
    this.d(ctx, 3, 5, outline)

    // --- Legs ---
    const lo = Math.round(opts.legOff ?? 0)
    // Thighs
    this.d(ctx, -2, 7 + lo, body)
    this.d(ctx, 2, 7 - lo, body)
    // Feet (wider, flat)
    this.d(ctx, -3, 8 + lo, outline)
    this.d(ctx, -2, 8 + lo, outline)
    this.d(ctx, -1, 8 + lo, outline)
    this.d(ctx, 1, 8 - lo, outline)
    this.d(ctx, 2, 8 - lo, outline)
    this.d(ctx, 3, 8 - lo, outline)

    // --- Arms up (static) ---
    if (opts.armsUp) {
      this.d(ctx, -4, 2, body)
      this.d(ctx, -5, 1, body)
      this.d(ctx, -5, 0, body)
      this.d(ctx, -5, -1, outline) // hand
      this.d(ctx, 4, 2, body)
      this.d(ctx, 5, 1, body)
      this.d(ctx, 5, 0, body)
      this.d(ctx, 5, -1, outline) // hand
    }

    // --- Arms waving (animated) ---
    if (opts.armWave !== undefined) {
      const aw = Math.round(Math.sin(opts.armWave) * 2)
      this.d(ctx, -4, 2, body) // shoulder joint
      this.d(ctx, -5, 2 + aw, body) // forearm
      this.d(ctx, -6, 1 + aw, outline) // hand
      this.d(ctx, 4, 2, body)
      this.d(ctx, 5, 2 - aw, body)
      this.d(ctx, 6, 1 - aw, outline)
    }
  }

  private robotSleep(ctx: CanvasRenderingContext2D): void {
    if (this.sleepSubState === 'sleeping') {
      this.robotDraw(ctx, { blink: true })
      this.drawZzz(ctx, 7, -9)
    } else if (this.sleepSubState === 'waking-wave') {
      const t = this.sleepWakeDuration
      const eyesOpen = t > 0.4 && t < 2.0
      this.robotDraw(ctx, {
        blink: !eyesOpen,
        armWave: this.time * 4,
        antennaBob: this.time * 2,
        coreGlow: eyesOpen
      })
    } else {
      const t = this.sleepWakeDuration
      const eyesOpen = t > 0.4 && t < 2.0
      this.robotDraw(ctx, { blink: !eyesOpen, coreGlow: eyesOpen })
      if (t > 0.3 && t < 2.2) {
        this.drawMusicBubble(ctx, 7, -11)
      }
    }
  }

  private robotFallingAsleep(ctx: CanvasRenderingContext2D): void {
    const p = Math.min(1, this.stateTimer / 1.5)
    ctx.translate(0, p * 3)
    this.robotDraw(ctx, {
      blink: p > 0.5,
      mouthOpen: p < 0.35,
      antennaBob: this.stateTimer * (2 - p * 2),
      coreGlow: p < 0.5
    })
    if (p > 0.7) this.drawZzz(ctx, 7, -9)
  }

  private robotWakingUp(ctx: CanvasRenderingContext2D): void {
    const p = Math.min(1, this.stateTimer / 1.0)
    ctx.translate(0, (1 - p) * 3)
    this.robotDraw(ctx, {
      blink: p < 0.3,
      antennaBob: this.stateTimer * 2,
      coreGlow: p > 0.4,
      armWave: p > 0.5 ? this.stateTimer * 3 : undefined
    })
  }

  private robotIdle(ctx: CanvasRenderingContext2D): void {
    ctx.translate(0, Math.sin(this.time * 2) * 1.5)
    this.robotDraw(ctx, {
      blink: Math.floor(this.time * 2) % 25 === 0,
      antennaBob: this.time * 2,
      coreGlow: Math.sin(this.time * 1.5) > 0
    })
  }

  private robotDance(ctx: CanvasRenderingContext2D): void {
    ctx.translate(Math.sin(this.time * 4) * 2, 0)
    this.robotDraw(ctx, {
      armWave: this.time * 6,
      legOff: Math.sin(this.time * 8),
      mouthOpen: this.vocalActive,
      antennaBob: this.time * 6,
      coreGlow: true
    })
  }

  private robotJump(ctx: CanvasRenderingContext2D): void {
    ctx.translate(0, Math.abs(Math.sin(this.time * 5)) * -6)
    this.robotDraw(ctx, {
      armsUp: true,
      mouthOpen: true,
      antennaBob: this.time * 8,
      coreGlow: true
    })
  }

  private robotHeadbang(ctx: CanvasRenderingContext2D): void {
    const dip = Math.abs(Math.sin(this.time * 10)) * 2
    ctx.translate(0, dip)
    this.robotDraw(ctx, {
      mouthOpen: true,
      antennaBob: this.time * 12,
      legOff: Math.sin(this.time * 10),
      coreGlow: true
    })
  }

  private robotFire(ctx: CanvasRenderingContext2D): void {
    const { body, dark } = this.colors
    const outline = shade(body, 80)
    const light = tint(body, 50)
    const shake = Math.round(Math.sin(this.time * 15) * 1)
    const firePhase = Math.floor(this.time * 8) % 4
    const fireColors = ['#ff4500', '#ff6b00', '#ffaa00', '#ffd700']

    ctx.translate(shake, Math.abs(Math.sin(this.time * 8)) * -3)

    // Antenna — on fire
    this.d(ctx, 0, -9, outline)
    this.d(ctx, -1, -10, fireColors[firePhase])
    this.d(ctx, 0, -10, fireColors[(firePhase + 1) % 4])
    this.d(ctx, -1, -11, fireColors[(firePhase + 2) % 4])
    this.d(ctx, 0, -11, fireColors[(firePhase + 3) % 4])
    if (firePhase > 1) {
      this.d(ctx, 0, -12, fireColors[firePhase])
      this.d(ctx, -1, -12, fireColors[(firePhase + 1) % 4])
    }

    // Head (square)
    for (let x = -5; x <= 5; x++) for (let y = -8; y <= 0; y++) this.d(ctx, x, y, body)

    // Visor (overheated — flickers)
    const visorFire = firePhase < 2 ? shade(body, 20) : shade(body, 60)
    for (let x = -4; x <= 4; x++) for (let y = -6; y <= -4; y++) this.d(ctx, x, y, visorFire)

    // LED eyes (bright, overdriven)
    const fireLed = fireColors[(firePhase + 1) % 4]
    this.d(ctx, -3, -6, fireLed)
    this.d(ctx, -2, -6, fireLed)
    this.d(ctx, -3, -5, fireLed)
    this.d(ctx, -2, -5, fireLed)
    this.d(ctx, 2, -6, fireLed)
    this.d(ctx, 3, -6, fireLed)
    this.d(ctx, 2, -5, fireLed)
    this.d(ctx, 3, -5, fireLed)

    // Ear bolts (sparking)
    this.d(ctx, -6, -5, fireColors[firePhase])
    this.d(ctx, -6, -4, fireColors[firePhase])
    this.d(ctx, 6, -5, fireColors[(firePhase + 2) % 4])
    this.d(ctx, 6, -4, fireColors[(firePhase + 2) % 4])

    // Mouth open
    for (let x = -2; x <= 2; x++) this.d(ctx, x, -1, outline)
    this.d(ctx, -1, -2, outline)
    this.d(ctx, 0, -2, dark)
    this.d(ctx, 1, -2, outline)

    // Body
    for (let x = -3; x <= 3; x++) for (let y = 1; y <= 5; y++) this.d(ctx, x, y, body)
    for (let x = -2; x <= 2; x++) this.d(ctx, x, 6, body)
    for (let x = -2; x <= 2; x++) for (let y = 2; y <= 4; y++) this.d(ctx, x, y, light)

    // Core — overloaded, cycling fire colors
    this.d(ctx, -1, 3, fireColors[(firePhase + 1) % 4])
    this.d(ctx, 0, 3, fireColors[firePhase])
    this.d(ctx, 1, 3, fireColors[(firePhase + 2) % 4])
    this.d(ctx, 0, 2, fireColors[(firePhase + 3) % 4])
    this.d(ctx, 0, 4, fireColors[(firePhase + 1) % 4])

    // Rivets
    this.d(ctx, -3, 1, outline)
    this.d(ctx, 3, 1, outline)
    this.d(ctx, -3, 5, outline)
    this.d(ctx, 3, 5, outline)

    // Legs
    const lo = Math.round(Math.sin(this.time * 8))
    this.d(ctx, -2, 7 + lo, body)
    this.d(ctx, 2, 7 - lo, body)
    this.d(ctx, -3, 8 + lo, outline)
    this.d(ctx, -2, 8 + lo, outline)
    this.d(ctx, -1, 8 + lo, outline)
    this.d(ctx, 1, 8 - lo, outline)
    this.d(ctx, 2, 8 - lo, outline)
    this.d(ctx, 3, 8 - lo, outline)

    // Arms diagonal up
    this.d(ctx, -4, 2, body)
    this.d(ctx, -5, 1, body)
    this.d(ctx, -6, 0, body)
    this.d(ctx, -7, -1, body)
    this.d(ctx, -7, -2, outline) // hand
    this.d(ctx, -8, -2, outline)
    this.d(ctx, 4, 2, body)
    this.d(ctx, 5, 1, body)
    this.d(ctx, 6, 0, body)
    this.d(ctx, 7, -1, body)
    this.d(ctx, 7, -2, outline)
    this.d(ctx, 8, -2, outline)

    // Fire on left hand
    if (firePhase === 0) {
      this.d(ctx, -8, -3, fireColors[0])
      this.d(ctx, -7, -3, fireColors[1])
      this.d(ctx, -8, -4, fireColors[2])
    } else if (firePhase === 1) {
      this.d(ctx, -8, -3, fireColors[1])
      this.d(ctx, -7, -3, fireColors[2])
      this.d(ctx, -8, -4, fireColors[3])
      this.d(ctx, -7, -4, fireColors[0])
    } else if (firePhase === 2) {
      this.d(ctx, -8, -3, fireColors[2])
      this.d(ctx, -7, -3, fireColors[3])
      this.d(ctx, -8, -4, fireColors[0])
      this.d(ctx, -7, -4, fireColors[1])
      this.d(ctx, -8, -5, fireColors[3])
    } else {
      this.d(ctx, -8, -3, fireColors[3])
      this.d(ctx, -7, -3, fireColors[0])
      this.d(ctx, -8, -4, fireColors[1])
      this.d(ctx, -7, -4, fireColors[2])
    }

    // Fire on right hand
    if (firePhase === 0) {
      this.d(ctx, 7, -3, fireColors[0])
      this.d(ctx, 8, -3, fireColors[1])
      this.d(ctx, 7, -4, fireColors[2])
    } else if (firePhase === 1) {
      this.d(ctx, 7, -3, fireColors[1])
      this.d(ctx, 8, -3, fireColors[2])
      this.d(ctx, 7, -4, fireColors[3])
      this.d(ctx, 8, -4, fireColors[0])
    } else if (firePhase === 2) {
      this.d(ctx, 7, -3, fireColors[2])
      this.d(ctx, 8, -3, fireColors[3])
      this.d(ctx, 7, -4, fireColors[0])
      this.d(ctx, 8, -4, fireColors[1])
      this.d(ctx, 7, -5, fireColors[3])
    } else {
      this.d(ctx, 7, -3, fireColors[3])
      this.d(ctx, 8, -3, fireColors[0])
      this.d(ctx, 7, -4, fireColors[1])
      this.d(ctx, 8, -4, fireColors[2])
    }
  }
}
