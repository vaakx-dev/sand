import type { GitStatus } from './status'

export interface GitPlace {
  cwd: string
  device: string
}

export const placeKey = ({ device, cwd }: GitPlace) => `${device}\u0000${cwd}`

export const samePlace = (a: GitPlace | undefined, b: GitPlace | undefined) => a?.cwd === b?.cwd && a?.device === b?.device

export interface PlaceStatus {
  place: GitPlace
  status?: GitStatus
}
