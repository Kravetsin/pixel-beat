import { reactive, ref } from 'vue'

export interface BeatEnergy {
  bass: number
  mid: number
  high: number
  overall: number
  isBeat: boolean
}

export function useBeatDetector(audio: HTMLAudioElement) {
  const energy = reactive<BeatEnergy>({
    bass: 0,
    mid: 0,
    high: 0,
    overall: 0,
    isBeat: false
  })
  const isActive = ref(false)

  let ctx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let dataArray: Uint8Array<ArrayBuffer> | null = null
  let intervalId: ReturnType<typeof setInterval> | null = null
  let initialized = false

  const energyHistory: number[] = []
  const HISTORY_SIZE = 30
  const BEAT_THRESHOLD = 1.4

  let smoothBass = 0
  let smoothMid = 0
  let smoothHigh = 0
  const SMOOTH_FACTOR = 0.8

  function init(): void {
    if (initialized) return
    initialized = true

    ctx = new AudioContext()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.6

    const source = ctx.createMediaElementSource(audio)
    source.connect(analyser)
    analyser.connect(ctx.destination)

    dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>
    isActive.value = true
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getEnergyInRange(data: any, start: number, end: number): number {
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

    const binCount = dataArray.length
    // At 48kHz, fftSize=2048: each bin ≈ 23.4Hz
    // Bass  (40-150Hz):  bins 2-6    (skip bin 0-1 to avoid DC offset)
    // Mid   (150-2kHz):  bins 7-85
    // High  (2kHz+):     bins 86+
    const rawBass = getEnergyInRange(dataArray, 2, 7)
    const rawMid = getEnergyInRange(dataArray, 7, 86)
    const rawHigh = getEnergyInRange(dataArray, 86, binCount)

    smoothBass = smoothBass * SMOOTH_FACTOR + rawBass * (1 - SMOOTH_FACTOR)
    smoothMid = smoothMid * SMOOTH_FACTOR + rawMid * (1 - SMOOTH_FACTOR)
    smoothHigh = smoothHigh * SMOOTH_FACTOR + rawHigh * (1 - SMOOTH_FACTOR)

    energy.bass = smoothBass
    energy.mid = smoothMid
    energy.high = smoothHigh
    energy.overall = smoothBass * 0.5 + smoothMid * 0.3 + smoothHigh * 0.2

    energyHistory.push(rawBass)
    if (energyHistory.length > HISTORY_SIZE) {
      energyHistory.shift()
    }

    if (energyHistory.length >= 10) {
      const avg = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length
      energy.isBeat = rawBass > avg * BEAT_THRESHOLD && rawBass > 0.15
    } else {
      energy.isBeat = false
    }

    window.api.sendBeatEnergy({
      bass: energy.bass,
      mid: energy.mid,
      high: energy.high,
      overall: energy.overall,
      isBeat: energy.isBeat
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
    energy.bass = 0
    energy.mid = 0
    energy.high = 0
    energy.overall = 0
    energy.isBeat = false
    window.api.sendBeatEnergy({ bass: 0, mid: 0, high: 0, overall: 0, isBeat: false })
  }

  return {
    energy,
    isActive,
    ensureReady,
    startAnalysis,
    stopAnalysis
  }
}
