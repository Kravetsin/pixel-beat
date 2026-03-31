import type { BeatEnergy } from '../composables/useBeatDetector'

export type PetState = 'sleep' | 'idle' | 'dance' | 'jump' | 'headbang'
export type PetType = 'cat' | 'ghost' | 'frog'

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
  scaleY = 1
  offsetX = 0
  offsetY = 0
  eyeGlow = false
  colors: PetColors = { body: '#e94560', dark: '#533483', inner: '#ff8fa3', eyeGlow: '#00ffff' }
  private time = 0
  private frameTimer = 0
  private beatPulse = 0
  private stateTimer = 0

  update(energy: BeatEnergy, dt: number): void {
    this.time += dt
    this.stateTimer += dt

    let newState: PetState = this.state
    if (energy.overall === 0) newState = 'sleep'
    else if (energy.overall < 0.1) newState = 'idle'
    else if (energy.bass > 0.85 && energy.overall > 0.55) newState = 'headbang'
    else if (energy.bass > 0.65 && energy.overall > 0.45) newState = 'jump'
    else newState = 'dance'

    if (newState !== this.state) {
      const minHold = newState === 'sleep' || newState === 'idle' ? 0 : 0.15
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
    ctx.translate(width / 2 + this.offsetX, height * 0.6 + this.offsetY)
    ctx.scale(1, this.scaleY)

    if (this.petType === 'ghost') this.renderGhost(ctx)
    else if (this.petType === 'frog') this.renderFrog(ctx)
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

  // ===================== CAT =====================

  private renderCat(ctx: CanvasRenderingContext2D): void {
    const s = this.state
    if (s === 'sleep') this.catSleep(ctx)
    else if (s === 'idle') this.catIdle(ctx)
    else if (s === 'dance') this.catDance(ctx)
    else if (s === 'jump') this.catJump(ctx)
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
    this.catDraw(ctx, { blink: true, tailWag: 0 })
    this.drawZzz(ctx, 6, -7)
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
      mouthOpen: this.frame % 4 < 2
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

  // ===================== JELLYFISH =====================

  private renderGhost(ctx: CanvasRenderingContext2D): void {
    const s = this.state
    if (s === 'sleep') this.jellySleep(ctx)
    else if (s === 'idle') this.jellyIdle(ctx)
    else if (s === 'dance') this.jellyDance(ctx)
    else if (s === 'jump') this.jellyJump(ctx)
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
    this.jellyDraw(ctx, { blink: true, tentacleSpeed: this.time * 1 })
    this.drawZzz(ctx, 6, -9)
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
      mouthOpen: this.frame % 4 < 2,
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

  // ===================== CRAB =====================

  private renderFrog(ctx: CanvasRenderingContext2D): void {
    const s = this.state
    if (s === 'sleep') this.crabSleep(ctx)
    else if (s === 'idle') this.crabIdle(ctx)
    else if (s === 'dance') this.crabDance(ctx)
    else if (s === 'jump') this.crabJump(ctx)
    else this.crabHeadbang(ctx)
  }

  private crabDraw(
    ctx: CanvasRenderingContext2D,
    opts: {
      blink?: boolean
      mouthOpen?: boolean
      clawAngle?: number
      legOff?: number
      squash?: number
    } = {}
  ): void {
    const { body, dark } = this.colors
    const outline = shade(body, 70)
    const light = tint(body, 50)
    const sq = opts.squash ?? 0
    const ca = opts.clawAngle ?? 0

    // Body (wide, round — crab shape)
    for (let x = -5; x <= 5; x++) for (let y = -1 + sq; y <= 4; y++) this.d(ctx, x, y, body)
    for (let x = -6; x <= 6; x++) for (let y = 1; y <= 3; y++) this.d(ctx, x, y, body)
    for (let x = -4; x <= 4; x++) this.d(ctx, x, -2 + sq, body)
    for (let x = -3; x <= 3; x++) this.d(ctx, x, -3 + sq, body)

    // Belly
    for (let x = -3; x <= 3; x++) for (let y = 1; y <= 3; y++) this.d(ctx, x, y, light)

    // Bottom outline
    for (let x = -5; x <= 5; x++) this.d(ctx, x, 5, outline)
    this.d(ctx, -6, 2, outline)
    this.d(ctx, -6, 3, outline)
    this.d(ctx, 6, 2, outline)
    this.d(ctx, 6, 3, outline)

    // Eye stalks
    this.d(ctx, -3, -4, body)
    this.d(ctx, -3, -5, body)
    this.d(ctx, 3, -4, body)
    this.d(ctx, 3, -5, body)

    // Eyes (2x2 on top of stalks)
    if (opts.blink) {
      this.drawClosedEye(ctx, -4, -6, outline)
      this.drawClosedEye(ctx, 3, -6, outline)
    } else {
      this.drawEye(ctx, -4, -6, outline)
      this.drawEye(ctx, 3, -6, outline)
    }

    // Mouth
    if (opts.mouthOpen) {
      this.d(ctx, -1, 0, outline)
      this.d(ctx, 0, 0, dark)
      this.d(ctx, 1, 0, outline)
    } else {
      this.d(ctx, -1, 0, outline)
      this.d(ctx, 0, 0, outline)
      this.d(ctx, 1, 0, outline)
    }

    // Blush
    this.drawBlush(ctx, -5, 5, -1)

    // === CLAWS (face up, pivot open at tips only) ===
    // cw: 0=closed, 1-2=tips spread
    const cw = Math.round(Math.max(0, Math.sin(ca)) * 2)

    // -- LEFT CLAW --
    // Arm: from body, out and up
    this.d(ctx, -7, 1, body)
    this.d(ctx, -7, 0, body)
    this.d(ctx, -8, -1, body)
    this.d(ctx, -8, -2, body)
    // Outer scoop: base fixed, tip pivots outward
    this.d(ctx, -9, -3, outline)          // base (fixed)
    this.d(ctx, -10, -4, outline)         // mid (fixed)
    this.d(ctx, -10 - cw, -5, outline)    // upper (spreads)
    this.d(ctx, -9 - cw, -6, outline)     // tip (spreads most)
    // Inner scoop: base fixed, tip pivots inward
    this.d(ctx, -7, -3, outline)          // base (fixed)
    this.d(ctx, -6, -4, outline)          // mid (fixed)
    this.d(ctx, -6 + cw, -5, outline)     // upper (spreads)
    this.d(ctx, -7 + cw, -6, outline)     // tip (spreads most)
    // Arm-to-claw
    this.d(ctx, -8, -3, body)

    // -- RIGHT CLAW --
    this.d(ctx, 7, 1, body)
    this.d(ctx, 7, 0, body)
    this.d(ctx, 8, -1, body)
    this.d(ctx, 8, -2, body)
    // Outer scoop
    this.d(ctx, 9, -3, outline)
    this.d(ctx, 10, -4, outline)
    this.d(ctx, 10 + cw, -5, outline)
    this.d(ctx, 9 + cw, -6, outline)
    // Inner scoop
    this.d(ctx, 7, -3, outline)
    this.d(ctx, 6, -4, outline)
    this.d(ctx, 6 - cw, -5, outline)
    this.d(ctx, 7 - cw, -6, outline)
    // Arm-to-claw
    this.d(ctx, 8, -3, body)

    // Legs (small, underneath)
    const lo = Math.round(opts.legOff ?? 0)
    this.d(ctx, -4, 5 + lo, outline)
    this.d(ctx, -5, 6 + lo, outline)
    this.d(ctx, -2, 5 - lo, outline)
    this.d(ctx, -3, 6 - lo, outline)
    this.d(ctx, 2, 5 + lo, outline)
    this.d(ctx, 3, 6 + lo, outline)
    this.d(ctx, 4, 5 - lo, outline)
    this.d(ctx, 5, 6 - lo, outline)
  }

  private crabSleep(ctx: CanvasRenderingContext2D): void {
    this.crabDraw(ctx, { blink: true })
    this.drawZzz(ctx, 6, -7)
  }

  private crabIdle(ctx: CanvasRenderingContext2D): void {
    ctx.translate(0, Math.sin(this.time * 2) * 1)
    this.crabDraw(ctx, {
      blink: Math.floor(this.time * 2) % 25 === 0,
      clawAngle: this.time * 1.5
    })
  }

  private crabDance(ctx: CanvasRenderingContext2D): void {
    // Side-to-side crab walk
    ctx.translate(Math.sin(this.time * 3) * 3, 0)
    this.crabDraw(ctx, {
      clawAngle: this.time * 6,
      mouthOpen: this.frame % 4 < 2,
      legOff: Math.sin(this.time * 8),
      squash: Math.round(Math.sin(this.time * 4) * 0.5)
    })
  }

  private crabJump(ctx: CanvasRenderingContext2D): void {
    ctx.translate(0, Math.abs(Math.sin(this.time * 5)) * -6)
    this.crabDraw(ctx, {
      clawAngle: this.time * 10,
      mouthOpen: true,
      squash: -1
    })
  }

  private crabHeadbang(ctx: CanvasRenderingContext2D): void {
    const dip = Math.abs(Math.sin(this.time * 10)) * 2
    ctx.translate(0, dip)
    this.crabDraw(ctx, {
      clawAngle: this.time * 12,
      mouthOpen: true,
      squash: Math.round(dip * 0.5)
    })
  }
}
