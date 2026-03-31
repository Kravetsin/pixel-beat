import Store from 'electron-store'

const store = new Store()

export function setValue(key: string, value: unknown): void {
  store.set(key, value)
}

export function getValue<T = unknown>(key: string): T | undefined {
  return store.get(key) as T | undefined
}
