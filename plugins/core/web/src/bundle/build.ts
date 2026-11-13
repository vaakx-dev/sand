import type { BuildArtifact, BuildMetafile, BuildOutput } from 'bun'
import { basename, join } from 'node:path'
import type { Extension } from '../extensions/discover'
import { compress, type Encoded } from './compress'
import { manifestSource, virtualModules } from './virtual'

interface Asset {
  type: string
  body: Uint8Array<ArrayBuffer>
  encoded: Encoded
}

interface Bundle {
  entry: string
  preload: string[]
  assets: Map<string, Asset>
  bundled: string[]
  problems: string[]
  failed: Record<string, string>
}

type Modules = Record<string, string>

const ASSETS = '/assets/'

const COMPILE_ON_LOAD = '//# allFunctionsCalledOnLoad'

const shared = (extensions: Extension[], modules: Modules) => ({
  drydock: Bun.resolveSync('drydock/browser', import.meta.dir),
  '@vaakx-dev/vrui': Bun.resolveSync('@vaakx-dev/vrui', import.meta.dir),
  zod: Bun.resolveSync('zod', import.meta.dir),
  ...modules,
  ...Object.fromEntries([...extensions].sort((a, b) => Number(b.builtin) - Number(a.builtin)).flatMap(extension => Object.entries(extension.modules))),
})

const compile = async (extensions: Extension[], bundled: Extension[], problems: string[], modules: Modules) => {
  const output = await Bun.build({
    entrypoints: [join(import.meta.dir, '..', 'boot', 'index.ts')],
    target: 'browser',
    conditions: ['browser'],
    minify: true,
    banner: COMPILE_ON_LOAD,
    splitting: true,
    naming: { entry: 'app-[hash].[ext]', chunk: 'chunk-[hash].[ext]' },
    publicPath: ASSETS,
    metafile: true,
    plugins: [virtualModules(manifestSource(extensions, bundled, problems), shared(extensions, modules))],
    throw: false,
  })
  if (!output.success) return { error: output.logs.map(String).join('\n') }
  return { output, bundled: bundled.map(extension => extension.id) }
}

const urlOf = (path: string) => ASSETS + basename(path)

const staticImports = (outputs: BuildMetafile['outputs'], from: string): string[] => {
  const seen = new Set<string>()
  const visit = (path: string) =>
    outputs[path]?.imports
      .filter(found => found.kind === 'import-statement' && !seen.has(found.path))
      .forEach(found => {
        seen.add(found.path)
        visit(found.path)
      })
  visit(from)
  return [...seen].map(urlOf)
}

const asset = async (artifact: BuildArtifact): Promise<[string, Asset]> => {
  const body = new Uint8Array(await artifact.arrayBuffer())
  return [urlOf(artifact.path), { type: artifact.type.split(';')[0]!, body, encoded: await compress(body) }]
}

const pack = async ({ outputs, metafile }: BuildOutput) => {
  const entry = outputs.find(artifact => artifact.kind === 'entry-point')!
  return { entry: urlOf(entry.path), preload: staticImports(metafile!.outputs, entry.path), assets: new Map(await Promise.all(outputs.map(asset))) }
}

const withoutBroken = async (extensions: Extension[], modules: Modules, error: string | undefined): Promise<Bundle> => {
  const alone = await Promise.all(extensions.map(extension => compile(extensions, [extension], [], modules)))
  const failed: Record<string, string> = {}
  extensions.forEach(({ id }, index) => {
    const result = alone[index]!
    if (!result.output) failed[id] = result.error ?? ''
  })
  const broken = new Set(Object.keys(failed))
  const problems = broken.size
    ? [...broken].map(id => `Couldn't build the web extension ${id}:\n${failed[id]}`)
    : [`Couldn't build the web extensions:\n${error}`]
  const kept = extensions.filter(extension => !broken.has(extension.id) && (broken.size > 0 || extension.builtin))
  const safe = await compile(extensions, kept, problems, modules)
  if (!safe.output) throw new Error(`${problems.join('\n\n')}\n\nThe remaining extensions also failed:\n${safe.error}`)
  return { ...(await pack(safe.output)), bundled: safe.bundled, problems, failed }
}

const bundle = async (extensions: Extension[], modules: Modules): Promise<Bundle> => {
  const full = await compile(extensions, extensions, [], modules)
  if (!full.output) return withoutBroken(extensions, modules, full.error)
  return { ...(await pack(full.output)), bundled: full.bundled, problems: [], failed: {} }
}

export { ASSETS, bundle, type Asset, type Bundle, type Modules }
