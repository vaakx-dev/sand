import { git, gitMaybe } from './run'

const fetches = new Map<string, { at: number; done: Promise<void> }>()

export const fetchOrigin = async (cwd: string, maxAgeMs = 5 * 60_000) => {
  const repo = await gitMaybe(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
  if (!repo) return
  const last = fetches.get(repo)
  if (last && Date.now() - last.at < maxAgeMs) return last.done
  const done = git(cwd, ['fetch', '--quiet', '--no-tags', 'origin']).then(() => undefined)
  fetches.set(repo, { at: Date.now(), done })
  return done
}
