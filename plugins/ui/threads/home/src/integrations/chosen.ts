const key = 'sand.newChat.place'

export interface Chosen {
  path: string
  device: string
}

const isChosen = (value: unknown): value is Chosen =>
  typeof value === 'object' && value !== null && 'path' in value && 'device' in value && typeof value.path === 'string' && typeof value.device === 'string'

export const readChosen = (): Chosen | undefined => {
  const stored = localStorage.getItem(key)
  if (!stored) return undefined
  try {
    const value: unknown = JSON.parse(stored)
    return isChosen(value) ? value : undefined
  } catch {
    return undefined
  }
}

export const writeChosen = (chosen: Chosen) => localStorage.setItem(key, JSON.stringify(chosen))
