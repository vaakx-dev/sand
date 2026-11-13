import { runtimeDeps, stampBuild, type Bundle } from '@sand/boot/build'
import { type AppFile, type BuildInfo, type BuildStamp, buildStamp, hashFiles, moduleFiles, moduleHash, readStamp, workspaceLinks } from '@sand/util/release'
import type { Workspace } from './split'

type BuildHistory = Pick<BuildStamp, 'commit' | 'changes'>

interface CoreParts {
  files: AppFile[]
  latest: number
  packages: Workspace[]
}

const sharedBun = () => {
  if (Bun.version.includes('-')) throw new Error('sand can only share release builds of Bun')
  return Bun.version
}

const readModules = async (root: string, packages: Workspace[]): Promise<AppFile[]> => {
  const found = await moduleFiles(await runtimeDeps(root, { packages }))
  return Promise.all(found.map(async ({ path, file }) => ({ path, bytes: await Bun.file(file).bytes() })))
}

const historyOf = (history: BuildHistory | undefined, saved: BuildStamp | undefined): BuildHistory => {
  const { commit, changes } = history ?? saved ?? {}
  return { ...(commit ? { commit } : {}), ...(changes?.length ? { changes } : {}) }
}

const packBundle = async (root: string, { files, latest, packages }: CoreParts, history?: BuildHistory): Promise<Bundle> => {
  const bun = sharedBun()
  const [saved, modules, links] = await Promise.all([readStamp(root), readModules(root, packages), workspaceLinks(root)])
  const hash = hashFiles(files)
  const build: BuildInfo = saved ? stampBuild(saved) : { id: hash, time: latest }
  const stamp: BuildStamp = { ...build, ...historyOf(history, saved), hash, modules: moduleHash(modules), links, bun }
  const entries = {
    ...Object.fromEntries([...files, ...modules].map(file => [file.path, file.bytes])),
    [buildStamp]: JSON.stringify(stamp),
  }
  const bytes = await new Bun.Archive(entries, { compress: 'gzip' }).bytes()
  return { build, hash, bytes, stamp }
}

export { packBundle }
