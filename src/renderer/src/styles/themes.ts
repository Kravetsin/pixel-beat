export interface Theme {
  id: string
  name: string
  vars: Record<string, string>
  pet: { body: string; dark: string; inner: string; eyeGlow: string }
}

export const themes: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    vars: {
      '--bg-dark': '#1a1a2e',
      '--bg-mid': '#16213e',
      '--bg-light': '#0f3460',
      '--accent': '#e94560',
      '--accent-soft': '#533483',
      '--text': '#eeeeee',
      '--text-dim': '#888888'
    },
    pet: { body: '#e94560', dark: '#533483', inner: '#ff8fa3', eyeGlow: '#00ffff' }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    vars: {
      '--bg-dark': '#0b1622',
      '--bg-mid': '#112240',
      '--bg-light': '#1a3a5c',
      '--accent': '#64ffda',
      '--accent-soft': '#2196a4',
      '--text': '#ccd6f6',
      '--text-dim': '#8892b0'
    },
    pet: { body: '#64ffda', dark: '#2196a4', inner: '#a8ffea', eyeGlow: '#ff6b9d' }
  },
  {
    id: 'coral',
    name: 'Coral Reef',
    vars: {
      '--bg-dark': '#1b1b3a',
      '--bg-mid': '#2a2a5a',
      '--bg-light': '#3b3b7a',
      '--accent': '#ff6b9d',
      '--accent-soft': '#c44dff',
      '--text': '#e8e8ff',
      '--text-dim': '#9999cc'
    },
    pet: { body: '#ff6b9d', dark: '#c44dff', inner: '#ffb3d0', eyeGlow: '#64ffda' }
  },
  {
    id: 'light',
    name: 'Daylight',
    vars: {
      '--bg-dark': '#e8e8e8',
      '--bg-mid': '#f5f5f5',
      '--bg-light': '#d0d0d0',
      '--accent': '#e94560',
      '--accent-soft': '#a070cc',
      '--text': '#222222',
      '--text-dim': '#777777'
    },
    pet: { body: '#e94560', dark: '#a070cc', inner: '#ff8fa3', eyeGlow: '#00b4d8' }
  },
  {
    id: 'hokusai',
    name: 'Hokusai',
    vars: {
      '--bg-dark': '#3b4470',
      '--bg-mid': '#4e5a8a',
      '--bg-light': '#6b7db0',
      '--accent': '#f0829a',
      '--accent-soft': '#8fb4d0',
      '--text': '#f2e4ea',
      '--text-dim': '#a8a0c0'
    },
    pet: { body: '#f0829a', dark: '#3b4470', inner: '#8fb4d0', eyeGlow: '#f7c4d4' }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    vars: {
      '--bg-dark': '#1a0a2e',
      '--bg-mid': '#2d1250',
      '--bg-light': '#451a6e',
      '--accent': '#ff6b35',
      '--accent-soft': '#d63384',
      '--text': '#ffeedd',
      '--text-dim': '#bb99aa'
    },
    pet: { body: '#ff6b35', dark: '#d63384', inner: '#ffaa80', eyeGlow: '#ffd700' }
  }
]

export function getTheme(id: string): Theme {
  return themes.find((t) => t.id === id) || themes[0]
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }
}
