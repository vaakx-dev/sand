import type { GitPlace } from '@sand/git/contract'

export const placeKey = (place: GitPlace) => `${place.device}\u0000${place.cwd}`
