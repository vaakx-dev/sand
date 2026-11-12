import type { GitRunner } from '@sand/git-runner/contract'

export interface Branches {
  current?: string
  commits: Map<string, string>
  upstreams: Map<string, string>
}

export interface Combined {
  tree: string
  conflicts: string[]
}

export interface Pending {
  tree: string
  landed: Set<string>
}

interface RawChange {
  path: string
  mode: string
  blob: string
  after: string
}

interface Landing {
  root: string
  fork: string
  bases: string[]
}

const read = { read: true }

const branchFormat = '--format=%(HEAD)%00%(refname)%00%(objectname)%00%(upstream)'

const addAll = ['-c', 'core.splitIndex=false', 'add', '--all']

const unknownOption = 129

const rawMeta = /^:(\d+) \d+ ([0-9a-f]+) ([0-9a-f]+) \S+$/

const rawFlags = ['--raw', '-z', '--no-abbrev', '--no-renames']

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

const rawChanges = (out: string): RawChange[] => {
  const tokens = out.split('\0')
  return tokens.flatMap((token, at) => {
    const meta = rawMeta.exec(token)
    const path = tokens[at + 1]
    return meta && path ? [{ path, mode: meta[1]!, blob: meta[2]!, after: meta[3]! }] : []
  })
}

const stateKey = ({ path, after }: RawChange) => `${path}\0${after}`

const history = { read: true, what: "Couldn't read the project's history" }

export const combine = async (git: GitRunner, dir: string, fork: string, ours: string, theirs: string): Promise<Combined> => {
  const args = ['merge-tree', '--write-tree', '--name-only', '--no-messages', '-z', `--merge-base=${fork}`, ours, theirs]
  const result = await git.run(dir, args)
  if (result.code === unknownOption) throw new Error('Merging needs git 2.40 or newer.')
  if (result.code !== 0 && result.code !== 1) throw new Error(git.classify(result, args, "Couldn't merge the thread's changes").message)
  const [tree = '', ...conflicts] = result.out.split('\0').filter(Boolean)
  return { tree, conflicts }
}

const landedStates = async (git: GitRunner, { root, fork, bases }: Landing) =>
  new Set(rawChanges(await git.ok(root, ['log', '--format=', ...rawFlags, ...new Set(bases), `^${fork}`], history)).map(stateKey))

const aheadBases = async (git: GitRunner, { root, fork, bases }: Landing) => {
  const unique = [...new Set(bases)]
  const ahead = await Promise.all(unique.map(base => git.ok(root, ['rev-list', '--max-count=1', base, `^${fork}`], history)))
  return unique.filter((_, at) => ahead[at])
}

const changedByMerging = async (git: GitRunner, { root, fork }: Landing, base: string, tree: string) => {
  const merged = await combine(git, root, fork, base, tree)
  return new Set((await git.ok(root, ['diff-tree', '-r', '-z', '--name-only', '--no-renames', merged.tree, base], history)).split('\0'))
}

const absorbedPaths = async (git: GitRunner, landing: Landing, tree: string) => {
  const bases = await aheadBases(git, landing)
  const changed = await Promise.all(bases.map(base => changedByMerging(git, landing, base, tree)))
  return (path: string) => changed.some(paths => !paths.has(path))
}

const landedChanges = async (git: GitRunner, landing: Landing, changes: RawChange[], tree: string) => {
  if (!changes.length) return []
  const states = await landedStates(git, landing)
  const seen = (change: RawChange) => states.has(stateKey(change))
  if (changes.every(seen)) return changes
  const absorbed = await absorbedPaths(git, landing, tree)
  return changes.filter(change => seen(change) || absorbed(change.path))
}

const asForkEntries = (changes: RawChange[]) => changes.map(({ mode, blob, path }) => `${mode} ${blob}\t${path}\0`).join('')

export const pendingOf = (git: GitRunner, landing: Landing): Promise<Pending> =>
  git.withTempIndex(landing.root, async env => {
    const what = "Couldn't read the thread's changes"
    const { root, fork } = landing
    await git.ok(root, addAll, { env, what })
    const changes = rawChanges(await git.ok(root, ['diff', '--cached', ...rawFlags, fork], { env, what }))
    const tree = await git.ok(root, ['write-tree'], { env, what })
    const landed = await landedChanges(git, landing, changes, tree)
    if (!landed.length) return { tree, landed: new Set<string>() }
    await git.ok(root, ['update-index', '-z', '--index-info'], { env, input: asForkEntries(landed), what })
    return { tree: await git.ok(root, ['write-tree'], { env, what }), landed: new Set(landed.map(change => change.path)) }
  })

export const commitAll = async (git: GitRunner, dir: string, message: string) => {
  if (!(await allChanges(git, dir))) return
  await git.ok(dir, addAll, { what: "Couldn't commit the thread's changes" })
  await git.ok(dir, ['commit', '--quiet', '--no-verify', '-m', message], { what: "Couldn't commit the thread's changes" })
}
