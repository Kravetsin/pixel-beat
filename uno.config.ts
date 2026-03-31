import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors: {
      'bg-dark': '#1a1a2e',
      'bg-mid': '#16213e',
      'bg-light': '#0f3460',
      accent: '#e94560',
      'accent-soft': '#533483',
      'text-primary': '#eeeeee',
      'text-dim': '#888888'
    }
  }
})
