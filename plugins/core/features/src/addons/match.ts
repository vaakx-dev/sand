import { errorMessage } from '@sand/util'
import { removeFolder } from '@sand/util/fs'
import type { AddonStamp } from '@sand/util/release'
import type { Found } from './catalog'
import { installedStamps, placeFolder, stageFolder } from './folder'

interface MatchTarget {
  root: string
  source: string
  hashes: Record<string, string>
  shelf(): Promise<Found>
}

interface Staged {
  id: string
  staging: string
}

const staleIds = (stamps: Map<string, AddonStamp>, { source, hashes }: MatchTarget) =>
  [...stamps].filter(([id, stamp]) => stamp.source === source && hashes[id] && hashes[id] !== stamp.hash).map(([id]) => id)

const dropAll = (staged: Staged[]) => Promise.all(staged.map(({ staging }) => removeFolder(staging).catch(() => {})))

const listingIn = ({ catalog }: Found, id: string, hash: string | undefined) => {
  const listing = catalog.addons.find(found => found.id === id && found.hash === hash)
  if (!listing) throw new Error(`the add-on ${id} that fits this sand build is not in its catalog`)
  return listing
}

const stageAll = async (target: MatchTarget, ids: string[]) => {
  const shelf = await target.shelf()
  const staged: Staged[] = []
  try {
    for (const id of ids) {
      const listing = listingIn(shelf, id, target.hashes[id])
      staged.push({ id, staging: await stageFolder({ root: target.root, listing, catalogUrl: shelf.url, source: target.source }) })
    }
    return staged
  } catch (error) {
    await dropAll(staged)
    throw error
  }
}

const placeAll = async (root: string, staged: Staged[]) => {
  const placed: string[] = []
  for (const { id, staging } of staged) {
    const failure = await placeFolder(root, id, staging).then(
      () => undefined,
      (error: unknown) => error,
    )
    if (failure) console.error(`sand could not put the add-on ${id} in place for the new build; it tries again when sand starts: ${errorMessage(failure)}`)
    else placed.push(id)
  }
  return placed
}

const stageMatch = async (target: MatchTarget) => {
  const ids = staleIds(await installedStamps(target.root), target)
  const staged = ids.length ? await stageAll(target, ids) : []
  return {
    ids,
    place: () => placeAll(target.root, staged),
    drop: () => dropAll(staged).then(() => {}),
  }
}

export { stageMatch, type MatchTarget }
