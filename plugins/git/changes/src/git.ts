import type { GitRunner } from '@sand/git-runner/contract'

const read = { read: true }

export const branchOf = async (git: GitRunner, dir: string) => (await git.maybe(dir, ['symbolic-ref', '--quiet', '--short', 'HEAD'], read)) || undefined

export const commitOf = (git: GitRunner, dir: string, ref: string) => git.maybe(dir, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], read)

const countLines = (out: string) => (out ? out.split(/\r?\n/).length : 0)

export const trackedChanges = async (git: GitRunner, dir: string) =>
  countLines(await git.ok(dir, ['status', '--porcelain', '--untracked-files=no'], { read: true, what: "Couldn't read the project folder's changes" }))

const allChanges = async (git: GitRunner, dir: string) =>
  countLines(await git.ok(dir, ['status', '--porcelain', '--untracked-files=all'], { read: true, what: "Couldn't read the thread's changes" }))

export const forkPoint = async (git: GitRunner, dir: string, refs: string[]) => {
  const commits = (await Promise.all([...new Set(refs)].map(ref => commitOf(git, dir, ref)))).filter(commit => commit !== undefined)
  return commits.length ? git.maybe(dir, ['merge-base', 'HEAD', ...commits], read) : undefined
}

const addAll = ['-c', 'core.splitIndex=false', 'add', '--all']

export const snapshot = (git: GitRunner, dir: string) =>
  git.withTempIndex(dir, async env => {
    await git.ok(dir, addAll, { env, what: "Couldn't read the thread's changes" })
    return git.ok(dir, ['write-tree'], { env, what: "Couldn't read the thread's changes" })
  })

export const commitAll = async (git: GitRunner, dir: string, message: string) => {
  if (!(await allChanges(git, dir))) return
  await git.ok(dir, addAll, { what: "Couldn't commit the thread's changes" })
  await git.ok(dir, ['commit', '--quiet', '--no-verify', '-m', message], { what: "Couldn't commit the thread's changes" })
}

export type Combined = { tree: string; conflicts?: never } | { conflicts: string[] }

const unknownOption = 129

export const combine = async (git: GitRunner, dir: string, fork: string, ours: string, theirs: string): Promise<Combined> => {
  const args = ['merge-tree', '--write-tree', '--name-only', '--no-messages', '-z', `--merge-base=${fork}`, ours, theirs]
  const result = await git.run(dir, args)
  if (result.code === unknownOption) throw new Error('Merging needs git 2.40 or newer.')
  if (result.code !== 0 && result.code !== 1) throw new Error(git.classify(result, args, "Couldn't merge the thread's changes").message)
  const [tree = '', ...paths] = result.out.split('\0').filter(Boolean)
  return result.code === 0 ? { tree } : { conflicts: paths }
}
