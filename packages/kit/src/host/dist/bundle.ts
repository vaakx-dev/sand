import { readBuild, type AppFile, type Bundle, type BuildStamp } from './build'
import { buildStamp, moduleFiles } from './files'
import { runtimeDeps } from './release/deps'
import { workspaceLinks } from './release/links'
import { moduleHash } from './release/manifest'

const sharedBun = () => {
  if (Bun.version.includes('-')) throw new Error('sand can only share release builds of Bun')
  return Bun.version
}

const readModules = async (root: string): Promise<AppFile[]> => {
  const found = await moduleFiles(await runtimeDeps(root))
  return Promise.all(found.map(async ({ path, file }) => ({ path, bytes: await Bun.file(file).bytes() })))
}

export type BuildHistory = Pick<BuildStamp, 'commit' | 'changes'>

const historyOf = (history: BuildHistory | undefined, saved: BuildStamp | undefined): BuildHistory => {
  const { commit, changes } = history ?? saved ?? {}
  return { ...(commit ? { commit } : {}), ...(changes?.length ? { changes } : {}) }
}

export const packBundle = async (root: string, history?: BuildHistory): Promise<Bundle> => {
  const bun = sharedBun()
  const [{ build, hash, files, stamp: saved }, modules, links] = await Promise.all([readBuild(root), readModules(root), workspaceLinks(root)])
  const stamp: BuildStamp = { ...build, ...historyOf(history, saved), hash, modules: moduleHash(modules), links, bun }
  const entries = {
    ...Object.fromEntries([...files, ...modules].map(file => [file.path, file.bytes])),
    [buildStamp]: JSON.stringify(stamp),
  }
  const bytes = await new Bun.Archive(entries, { compress: 'gzip' }).bytes()
  return { build, hash, bytes, stamp }
}
