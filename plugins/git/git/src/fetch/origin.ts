import { errorMessage } from '@sand/util'
import { gitMaybe, gitOk } from '../run/run'

export type FetchOutcome = { ok: true } | { ok: false; error: string } | undefined

const timeoutMs = 60_000

const hasOrigin = async (dir: string) => {
  const remotes = await gitMaybe(dir, ['remote'], { read: true })
  return !!remotes?.split(/\r?\n/).includes('origin')
}

export const fetchOrigin = async (dir: string): Promise<FetchOutcome> => {
  try {
    if (!(await hasOrigin(dir))) return undefined
    await gitOk(dir, ['fetch', '--quiet', '--no-tags', '--prune', 'origin'], { timeoutMs })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}
