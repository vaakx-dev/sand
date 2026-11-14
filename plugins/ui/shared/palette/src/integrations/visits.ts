import type { Visit } from '../visits'

const KEY = 'sand.palette.visits'

const isVisit = (value: unknown): value is Visit =>
  Array.isArray(value) && value.length === 3 && typeof value[0] === 'string' && typeof value[1] === 'number' && typeof value[2] === 'number'

export const readVisits = (): Visit[] => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter(isVisit) : []
  } catch {
    return []
  }
}

export const writeVisits = (visits: Visit[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(visits))
  } catch {}
}
