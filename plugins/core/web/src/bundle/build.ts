import { join } from 'node:path'
import type { Extension } from '../extensions/discover'
import { compress, type Encoded } from './compress'
import { manifestSource, virtualModules } from './virtual'

export interface Bundle {
  id: string
  script: string
  encoded: Encoded
  bundled: string[]
  problems: string[]
  failed: Record<string, string>
}

const placeholder = 'sand-build-id-placeholder'

export type Modules = Record<string, string>

const shared = (extensions: Extension[], modules: Modules) => ({
  drydock: Bun.resolveSync('drydock/browser', import.meta.dir),
  '@vaakx-dev/vrui': Bun.resolveSync('@vaakx-dev/vrui', import.meta.dir),
  ...modules,
  ...Object.fromEntries([...extensions].sort((a, b) => Number(b.builtin) - Number(a.builtin)).flatMap(extension => Object.entries(extension.modules))),
})

const compile = async (extensions: Extension[], bundled: Extension[], problems: string[], modules: Modules) => {
  const output = await Bun.build({
    entrypoints: [join(import.meta.dir, '..', 'boot', 'index.ts')],
    target: 'browser',
    conditions: ['browser'],
    minify: true,
    plugins: [virtualModules(manifestSource(placeholder, extensions, bundled, problems), shared(extensions, modules))],
    throw: false,
  })
  if (!output.success) return { error: output.logs.map(String).join('\n') }
  return { script: await output.outputs[0]!.text(), bundled: bundled.map(extension => extension.id) }
}

const stamp = async (built: string) => {
  const id = Bun.hash(built).toString(36)
  const script = built.replaceAll(placeholder, id)
  return { id, script, encoded: await compress(script) }
}

const withoutBroken = async (extensions: Extension[], modules: Modules, error: string | undefined): Promise<Bundle> => {
  const alone = await Promise.all(extensions.map(extension => compile(extensions, [extension], [], modules)))
  const failed: Record<string, string> = {}
  extensions.forEach(({ id }, index) => {
    const result = alone[index]!
    if (!result.script) failed[id] = result.error ?? ''
  })
  const broken = new Set(Object.keys(failed))
  const problems = broken.size
    ? [...broken].map(id => `Couldn't build the web extension ${id}:\n${failed[id]}`)
    : [`Couldn't build the web extensions:\n${error}`]
  const kept = extensions.filter(extension => !broken.has(extension.id) && (broken.size > 0 || extension.builtin))
  const safe = await compile(extensions, kept, problems, modules)
  if (!safe.script) throw new Error(`${problems.join('\n\n')}\n\nThe remaining extensions also failed:\n${safe.error}`)
  return { ...(await stamp(safe.script)), bundled: safe.bundled, problems, failed }
}

export const bundle = async (extensions: Extension[], modules: Modules): Promise<Bundle> => {
  const full = await compile(extensions, extensions, [], modules)
  if (!full.script) return withoutBroken(extensions, modules, full.error)
  return { ...(await stamp(full.script)), bundled: full.bundled, problems: [], failed: {} }
}
