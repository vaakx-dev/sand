import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

export interface Build {
  id: string
  time: number
  bun: string
  folder: string
  addons: Record<string, string>
}

export const repoRoot = resolve(import.meta.dir, '..', '..', '..', '..', '..')

const cacheFolder = join(tmpdir(), 'sand-upgrade-builds')

const run = async (command: string[], cwd: string, env: Record<string, string | undefined> = process.env) => {
  const proc = Bun.spawn(command, { cwd, env, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited])
  if (code !== 0) throw new Error(`${command.join(' ')} failed (exit code ${code}) in ${cwd}:\n${err || out}`)
  return out.trim()
}

const git = (...args: string[]) => run(['git', '-C', repoRoot, ...args], repoRoot)

export const readBuild = async (folder: string): Promise<Build> => {
  const stamp = await Bun.file(join(folder, 'sand-build.json')).json()
  const catalog: { addons: { id: string; hash: string }[] } = await Bun.file(join(folder, 'sand-addons.json')).json()
  const addons = Object.fromEntries(catalog.addons.map(addon => [addon.id, addon.hash]))
  return { id: stamp.id, time: stamp.time, bun: stamp.bun, folder, addons }
}

const releaseAssets = async (root: string, out: string) => {
  const home = await mkdtemp(join(tmpdir(), 'sand-upgrade-assets-home-'))
  try {
    await rm(out, { recursive: true, force: true })
    await run([process.execPath, join(root, 'apps', 'sand', 'src', 'main.ts'), 'release-assets', out], root, { ...process.env, SAND_HOME: home })
    return await readBuild(out)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
}

const baseCommit = async () => {
  const given = process.env.SAND_UPGRADE_BASE
  if (given) return git('rev-parse', `${given}^{commit}`)
  const head = await git('rev-parse', 'HEAD')
  const base = await git('merge-base', 'HEAD', 'origin/main')
  if (base !== head) return base
  const dirty = await git('status', '--porcelain', '--untracked-files=no')
  return dirty ? head : git('rev-parse', 'HEAD~1')
}

const backdate = async (folder: string, seconds: number) => {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const path = join(folder, entry.name)
    if (entry.isDirectory()) await backdate(path, seconds)
    await utimes(path, seconds, seconds)
  }
}

const backdateApp = async (root: string, seconds: number) => {
  for (const name of ['apps', 'packages', 'plugins']) {
    await backdate(join(root, name), seconds)
    await utimes(join(root, name), seconds, seconds)
  }
  for (const name of ['package.json', 'bun.lock', 'tsconfig.json']) if (existsSync(join(root, name))) await utimes(join(root, name), seconds, seconds)
}

export const previousBuild = async () => {
  const commit = await baseCommit()
  const out = join(cacheFolder, `${commit.slice(0, 12)}-${Bun.version}`)
  if (existsSync(join(out, 'sand-build.json')) && existsSync(join(out, 'sand-addons.json'))) return readBuild(out)
  await mkdir(cacheFolder, { recursive: true })
  const tree = join(cacheFolder, `tree-${commit.slice(0, 12)}-${Date.now()}`)
  await git('worktree', 'add', '--detach', tree, commit)
  try {
    await run([process.execPath, 'install'], tree)
    await backdateApp(tree, Number(await git('log', '-1', '--format=%ct', commit)))
    return await releaseAssets(tree, out)
  } finally {
    await git('worktree', 'remove', '--force', tree).catch(() => rm(tree, { recursive: true, force: true }))
    await git('worktree', 'prune').catch(() => {})
  }
}

export const thisBuild = (out: string) => releaseAssets(repoRoot, out)

export const derivedBuild = async (from: Build, out: string, change: (root: string) => Promise<void>) => {
  const root = `${out}-tree`
  await rm(root, { recursive: true, force: true })
  await new Bun.Archive(await Bun.file(join(from.folder, 'sand.tar.gz')).bytes()).extract(root)
  try {
    await run([process.execPath, join(root, 'packages', 'util', 'src', 'release', 'ready.ts'), root], root)
    await rm(join(root, 'sand-build.json'))
    await change(root)
    return await releaseAssets(root, out)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
