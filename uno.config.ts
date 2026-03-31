import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors: {
      'bg-dark': 'var(--bg-dark)',
      'bg-mid': 'var(--bg-mid)',
      'bg-light': 'var(--bg-light)',
      accent: 'var(--accent)',
      'accent-soft': 'var(--accent-soft)',
      'text-primary': 'var(--text)',
      'text-dim': 'var(--text-dim)'
    }
  }
})
