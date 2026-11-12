import type { GitRunner } from '@sand/git-runner/contract'

export interface Branches {
  current?: string
  commits: Map<string, string>
  upstreams: Map<string, string>
}

export type Combined = { tree: string; conflicts?: never } | { conflicts: string[] }

const read = { read: true }

const branchFormat = '--format=%(HEAD)%00%(refname)%00%(objectname)%00%(upstream)'

const addAll = ['-c', 'core.splitIndex=false', 'add', '--all']

const unknownOption = 129

const rowsOf = (out: string) =>
  out.split(/\r?\n/).flatMap(line => {
    const [mark = '', ref = '', commit = '', upstream = ''] = line.split('\0')
    return ref && commit ? [{ mark, ref, commit, upstream }] : []
  })

export const branchesOf = async (git: GitRunner, dir: string): Promise<Branches> => {
  const out = await git.ok(dir, ['for-each-ref', branchFormat, 'refs/heads', 'refs/remotes'], { read: true, what: "Couldn't read the project's branches" })
  const rows = rowsOf(out)
  return {
    current: rows.find(row => row.mark === '*')?.ref.replace(/^refs\/heads\//, ''),
    commits: new Map(rows.map(row => [row.ref, row.commit])),
    upstreams: new Map(rows.flatMap(row => (row.upstream ? [[row.ref, row.upstream] as const] : []))),
  }
}

const countLines = (out: string) => (out ? out.split(/\r?\n/).length : 0)

export const trackedChanges = async (git: GitRunner, dir: string) =>
  countLines(await git.ok(dir, ['status', '--porcelain', '--untracked-files=no'], { read: true, what: "Couldn't read the project folder's changes" }))

const allChanges = async (git: GitRunner, dir: string) =>
  countLines(await git.ok(dir, ['status', '--porcelain', '--untracked-files=all'], { read: true, what: "Couldn't read the thread's changes" }))

export const forkPoint = async (git: GitRunner, dir: string, commits: string[]) =>
  commits.length ? git.maybe(dir, ['merge-base', 'HEAD', ...new Set(commits)], read) : undefined

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

export const combine = async (git: GitRunner, dir: string, fork: string, ours: string, theirs: string): Promise<Combined> => {
  const args = ['merge-tree', '--write-tree', '--name-only', '--no-messages', '-z', `--merge-base=${fork}`, ours, theirs]
  const result = await git.run(dir, args)
  if (result.code === unknownOption) throw new Error('Merging needs git 2.40 or newer.')
  if (result.code !== 0 && result.code !== 1) throw new Error(git.classify(result, args, "Couldn't merge the thread's changes").message)
  const [tree = '', ...paths] = result.out.split('\0').filter(Boolean)
  return result.code === 0 ? { tree } : { conflicts: paths }
}
