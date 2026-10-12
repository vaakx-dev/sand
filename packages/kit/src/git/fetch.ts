import { commonDirOf } from './common'
import { git, gitMaybe } from './run'

const timeoutMs = 60_000
const mostBackoff = 5

const fetches = new Map<string, { at: number; done: Promise<boolean> }>()
const failures = new Map<string, number>()

const originRefs = (cwd: string) => gitMaybe(cwd, ['for-each-ref', '--format=%(objectname) %(refname)', 'refs/remotes/origin'])

const fetchMoved = async (cwd: string, repo: string) => {
  const before = await originRefs(cwd)
  const { code } = await git(cwd, ['fetch', '--quiet', '--no-tags', 'origin'], { timeoutMs })
  failures.set(repo, code === 0 ? 0 : Math.min((failures.get(repo) ?? 0) + 1, mostBackoff))
  return code === 0 && before !== (await originRefs(cwd))
}

export const fetchOrigin = async (cwd: string, maxAgeMs = 5 * 60_000) => {
  const repo = await commonDirOf(cwd)
  if (!repo) return false
  const last = fetches.get(repo)
  if (last && Date.now() - last.at < maxAgeMs * 2 ** (failures.get(repo) ?? 0)) return last.done.then(() => false)
  const done = fetchMoved(cwd, repo)
  fetches.set(repo, { at: Date.now(), done })
  return done
}
