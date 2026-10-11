import type { DraftTarget } from '../contract'
import { addressParam, addressState, pushAddress, updateAddress } from '@sand/dom'
import { isRecord } from '@sand/kit'

const key = 'session'

export interface Place {
  session?: string
  draft?: DraftTarget
}

export type Visit = 'push' | 'replace' | 'restore'

const placeId = ({ session, draft }: Place) => session ?? draft?.id

const moves = (from: Place, to: Place) => placeId(from) !== placeId(to) && Boolean(from.session || to.session)

const requestedDraft = (): DraftTarget | undefined => {
  const { draft } = addressState()
  if (!isRecord(draft) || typeof draft.id !== 'string' || typeof draft.cwd !== 'string') return undefined
  return { id: draft.id, cwd: draft.cwd, ...(typeof draft.device === 'string' && { device: draft.device }) }
}

export const requestedSession = () => addressParam(key)

export const requestedPlace = (): Place => ({ session: requestedSession(), draft: requestedDraft() })

export const samePlace = (a: Place, b: Place) => placeId(a) === placeId(b)

export const behindSession = () => addressState().behind

export const sessionLink = (id: string) => {
  const url = new URL(location.href)
  url.hash = ''
  url.searchParams.set(key, id)
  return url.href
}

export const recordPlace = (from: Place, to: Place, visit: Visit) => {
  if (visit === 'restore') return
  if (visit === 'push' && moves(from, to)) pushAddress({ [key]: to.session }, { draft: to.draft, behind: from.session })
  else updateAddress({ [key]: to.session }, { draft: to.draft })
}
