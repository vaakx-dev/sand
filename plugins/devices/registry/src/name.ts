import { defaultHome, samePath } from '@sand/util/fs'
import { hostname } from 'node:os'

const MADE_UP_NAMES = ['Aspen', 'Birch', 'Cedar', 'Elm', 'Hazel', 'Juniper', 'Larch', 'Maple', 'Rowan', 'Willow']

const madeUpName = (id: string) => {
  const seed = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return `${MADE_UP_NAMES[seed % MADE_UP_NAMES.length]} sandbox`
}

export const seedName = (home: string, id: string) => (samePath(home, defaultHome()) ? hostname() : madeUpName(id))
