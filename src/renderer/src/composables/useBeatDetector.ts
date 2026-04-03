import { reactive, ref } from 'vue'

export interface BeatEnergy {
  kick: number // 20-100 Hz   — kick drum, sub-bass, 808
  bass: number // 100-250 Hz  — bass guitar, bass synth body
  vocal: number // 250-4kHz   — vocals, guitars, keys, snare body
  high: number // 4kHz+       — cymbals, hi-hats, sibilance, air
  overall: number
  vocalRaw: number // fast-reacting vocal level for mouth sync
  isKickHit: boolean // transient spike in kick range
  isSnareHit: boolean // transient spike in presence range (2-8kHz)
}

export function useBeatDetector(audio: HTMLAudioElement) {
  const energy = reactive<BeatEnergy>({
    kick: 0,
    bass: 0,
    vocal: 0,
    high: 0,
    overall: 0,
    vocalRaw: 0,
    isKickHit: false,
    isSnareHit: false
  })
  const isActive = ref(false)

  let ctx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let dataArray: Uint8Array<ArrayBuffer> | null = null
  let intervalId: ReturnType<typeof setInterval> | null = null
  let initialized = false

  let smoothKick = 0
  let smoothBass = 0
  let smoothVocal = 0
  let smoothHigh = 0
  const SMOOTH_FACTOR = 0.65
  let smoothVocalFast = 0 // very responsive, for mouth sync

  // Transient detection: previous raw values + adaptive averages
  let prevRawKick = 0
  let prevRawSnare = 0
  const kickHistory: number[] = []
  const snareHistory: number[] = []
  const vocalHistory: number[] = []
  const HISTORY_SIZE = 30
  const VOCAL_HISTORY_SIZE = 60 // ~1 second window for vocal baseline

  function init(): void {
    if (initialized) return
    initialized = true

    ctx = new AudioContext()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.5

    const source = ctx.createMediaElementSource(audio)
    source.connect(analyser)
    analyser.connect(ctx.destination)

    dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>
    isActive.value = true
  }

  function getEnergyInRange(data: Uint8Array<ArrayBuffer>, start: number, end: number): number {
    let sum = 0
    const count = end - start
    for (let i = start; i < end && i < data.length; i++) {
      sum += data[i]
    }
    return sum / (count * 255)
  }

  function update(): void {
    if (!analyser || !dataArray) return

    analyser.getByteFrequencyData(dataArray)

    const sr = analyser.context.sampleRate
    const binHz = sr / analyser.fftSize

    // Energy band boundaries
    const kickEnd = Math.round(100 / binHz) // 20-100 Hz
    const bassEnd = Math.round(250 / binHz) // 100-250 Hz
    const vocalEnd = Math.round(4000 / binHz) // 250-4kHz

    // Snare presence range (2-8kHz) — overlaps vocal+high, separate measurement
    const snareBinStart = Math.round(2000 / binHz)
    const snareBinEnd = Math.round(8000 / binHz)

    const rawKick = getEnergyInRange(dataArray, 1, kickEnd)
    const rawBass = getEnergyInRange(dataArray, kickEnd, bassEnd)
    const rawVocal = getEnergyInRange(dataArray, bassEnd, vocalEnd)
    const rawHigh = getEnergyInRange(dataArray, vocalEnd, dataArray.length)
    const rawSnare = getEnergyInRange(dataArray, snareBinStart, snareBinEnd)

    // Smooth energy values for display & state transitions
    smoothKick = smoothKick * SMOOTH_FACTOR + rawKick * (1 - SMOOTH_FACTOR)
    smoothBass = smoothBass * SMOOTH_FACTOR + rawBass * (1 - SMOOTH_FACTOR)
    smoothVocal = smoothVocal * SMOOTH_FACTOR + rawVocal * (1 - SMOOTH_FACTOR)
    smoothHigh = smoothHigh * SMOOTH_FACTOR + rawHigh * (1 - SMOOTH_FACTOR)

    // Fast vocal: 70% new, 30% old — reacts almost instantly, closes mouth quickly
    smoothVocalFast = smoothVocalFast * 0.3 + rawVocal * 0.7

    // Adaptive vocal detection: compare fast vocal to running baseline
    vocalHistory.push(rawVocal)
    if (vocalHistory.length > VOCAL_HISTORY_SIZE) vocalHistory.shift()
    const vocalBaseline =
      vocalHistory.length >= 10
        ? vocalHistory.reduce((a, b) => a + b, 0) / vocalHistory.length
        : 0
    // Mouth opens when current vocal is above baseline by 15%+ (vocal spike over instruments)
    const vocalActive = smoothVocalFast > vocalBaseline * 1.15 && smoothVocalFast > 0.15

    energy.kick = smoothKick
    energy.bass = smoothBass
    energy.vocal = smoothVocal
    energy.high = smoothHigh
    energy.vocalRaw = vocalActive ? smoothVocalFast : 0
    energy.overall = smoothKick * 0.2 + smoothBass * 0.2 + smoothVocal * 0.4 + smoothHigh * 0.2

    // --- Transient detection (delta-based, raw unsmoothed) ---
    // Kick: positive spike compared to both previous frame AND running average
    const kickDelta = rawKick - prevRawKick
    kickHistory.push(rawKick)
    if (kickHistory.length > HISTORY_SIZE) kickHistory.shift()
    const kickAvg =
      kickHistory.length >= 5
        ? kickHistory.reduce((a, b) => a + b, 0) / kickHistory.length
        : 0
    energy.isKickHit = kickDelta > 0.04 && rawKick > kickAvg * 1.2 && rawKick > 0.06

    // Snare: positive spike in 2-8kHz presence range
    const snareDelta = rawSnare - prevRawSnare
    snareHistory.push(rawSnare)
    if (snareHistory.length > HISTORY_SIZE) snareHistory.shift()
    const snareAvg =
      snareHistory.length >= 5
        ? snareHistory.reduce((a, b) => a + b, 0) / snareHistory.length
        : 0
    energy.isSnareHit = snareDelta > 0.03 && rawSnare > snareAvg * 1.15 && rawSnare > 0.04

    prevRawKick = rawKick
    prevRawSnare = rawSnare

    window.api.sendBeatEnergy({
      kick: energy.kick,
      bass: energy.bass,
      vocal: energy.vocal,
      high: energy.high,
      overall: energy.overall,
      vocalRaw: energy.vocalRaw,
      isKickHit: energy.isKickHit,
      isSnareHit: energy.isSnareHit
    })
  }

  /** Must be called (and awaited) BEFORE audio.play() */
  async function ensureReady(): Promise<void> {
    if (!initialized) init()
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume()
    }
  }

  function startAnalysis(): void {
    if (intervalId === null) {
      intervalId = setInterval(update, 16)
    }
  }

  function stopAnalysis(): void {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    energy.kick = 0
    energy.bass = 0
    energy.vocal = 0
    energy.high = 0
    energy.overall = 0
    energy.vocalRaw = 0
    energy.isKickHit = false
    energy.isSnareHit = false
    smoothVocalFast = 0
    window.api.sendBeatEnergy({
      kick: 0,
      bass: 0,
      vocal: 0,
      high: 0,
      overall: 0,
      vocalRaw: 0,
      isKickHit: false,
      isSnareHit: false
    })
  }

  return {
    energy,
    isActive,
    ensureReady,
    startAnalysis,
    stopAnalysis
  }
}
