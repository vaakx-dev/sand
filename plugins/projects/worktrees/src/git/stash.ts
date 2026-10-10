import { gitMaybe, gitOk } from './run'

const top = (cwd: string) => gitMaybe(cwd, ['rev-parse', '-q', '--verify', 'refs/stash'])

export const stashAll = async (cwd: string, message: string) => {
  const before = await top(cwd)
  await gitOk(cwd, ['stash', 'push', '--include-untracked', '-m', message])
  const after = await top(cwd)
  return after && after !== before ? after : undefined
}

export const applyStash = (cwd: string, sha: string) => gitOk(cwd, ['stash', 'apply', sha])

export const dropStash = async (cwd: string, sha: string) => {
  const list = ((await gitMaybe(cwd, ['stash', 'list', '--format=%H'])) ?? '').split('\n')
  const index = list.indexOf(sha)
  if (index >= 0) await gitOk(cwd, ['stash', 'drop', `stash@{${index}}`])
}
