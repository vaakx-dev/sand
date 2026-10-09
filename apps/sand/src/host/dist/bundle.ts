import { currentBuild, readBuild, type AppFile, type Bundle, type BuildStamp } from './build'
import { buildStamp, moduleFiles } from './files'
import { runtimeDeps } from './release/deps'
import { workspaceLinks } from './release/links'
import { moduleHash } from './release/manifest'

const cache = new Map<string, Promise<Bundle>>()

const sharedBun = () => {
  if (Bun.version.includes('-')) throw new Error('sand can only share release builds of Bun')
  return Bun.version
}

const readModules = async (root: string): Promise<AppFile[]> => {
  const found = await moduleFiles(await runtimeDeps(root))
  return Promise.all(found.map(async ({ path, file }) => ({ path, bytes: await Bun.file(file).bytes() })))
}

const packBundle = async (root: string): Promise<Bundle> => {
  const bun = sharedBun()
  const [{ build, hash, files }, modules, links] = await Promise.all([readBuild(root), readModules(root), workspaceLinks(root)])
  const stamp: BuildStamp = { ...build, hash, modules: moduleHash(modules), links, bun }
  const entries = {
    ...Object.fromEntries([...files, ...modules].map(file => [file.path, file.bytes])),
    [buildStamp]: JSON.stringify(stamp),
  }
  const bytes = await new Bun.Archive(entries, { compress: 'gzip' }).bytes()
  return { build, hash, bytes }
}

export const createBundle = async (root: string): Promise<Bundle> => {
  const { build, hash } = await currentBuild(root)
  const cached = cache.get(root)
  if (cached) {
    const bundle = await cached.catch(() => undefined)
    if (bundle?.hash === hash && bundle.build.id === build.id) return bundle
    if (cache.get(root) !== cached) return createBundle(root)
  }
  const promise = packBundle(root)
  cache.set(root, promise)
  promise.catch(() => {
    if (cache.get(root) === promise) cache.delete(root)
  })
  return promise
}
