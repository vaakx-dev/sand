import { stored } from '@vaakx-dev/vrui'

export interface Chosen {
  path: string
  device: string
}

const isChosen = (value: unknown): value is Chosen =>
  typeof value === 'object' && value !== null && 'path' in value && 'device' in value && typeof value.path === 'string' && typeof value.device === 'string'

export const chosen = stored<Chosen | null>('sand.newChat.place', null, value => value === null || isChosen(value))
