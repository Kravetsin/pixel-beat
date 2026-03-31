import { ref } from 'vue'
import { themes, getTheme, applyTheme, type Theme } from '../styles/themes'

const currentTheme = ref<Theme>(themes[0])

let initialized = false

export function useTheme() {
  if (!initialized) {
    initialized = true
    // Load saved theme (deferred to avoid blocking setup)
    Promise.resolve().then(async () => {
      try {
        const id = await window.api.loadData<string>('theme')
        if (id) {
          currentTheme.value = getTheme(id)
          applyTheme(currentTheme.value)
        }
      } catch {
        // Ignore errors during initial load
      }
    })
  }

  function setTheme(id: string): void {
    currentTheme.value = getTheme(id)
    applyTheme(currentTheme.value)
    window.api.saveData('theme', id)
  }

  function nextTheme(): void {
    const idx = themes.findIndex((t) => t.id === currentTheme.value.id)
    const next = themes[(idx + 1) % themes.length]
    setTheme(next.id)
  }

  return {
    currentTheme,
    themes,
    setTheme,
    nextTheme
  }
}
