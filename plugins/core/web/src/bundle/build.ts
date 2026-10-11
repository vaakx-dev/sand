import { dirname, join } from 'node:path'
import type { Extension } from '../extensions/discover'
import { compress, type Encoded } from './compress'
import { manifestSource, virtualModules } from './virtual'

export interface Bundle {
  id: string
  script: string
  encoded: Encoded
  tried: string[]
  bundled: string[]
  problems: string[]
  failed: Record<string, string>
}

const placeholder = 'sand-build-id-placeholder'

const shared = () => {
  const dom = Bun.resolveSync('@sand/dom', import.meta.dir)
  return {
    drydock: Bun.resolveSync('drydock/browser', import.meta.dir),
    '@sand/dom': dom,
    '@sand/kit': Bun.resolveSync('@sand/kit', import.meta.dir),
    '@sand/protocol': Bun.resolveSync('@sand/protocol', import.meta.dir),
    '@vaakx-dev/vrui': Bun.resolveSync('@vaakx-dev/vrui', dirname(dom)),
  }
}

const compile = async (extensions: Extension[], bundled: Extension[], problems: string[]) => {
  const output = await Bun.build({
    entrypoints: [join(import.meta.dir, '..', 'boot', 'index.ts')],
    target: 'browser',
    conditions: ['browser'],
    minify: true,
    plugins: [virtualModules(manifestSource(placeholder, extensions, bundled, problems), shared())],
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

const withoutBroken = async (extensions: Extension[], wanted: Extension[], error: string | undefined): Promise<Bundle> => {
  const alone = await Promise.all(wanted.map(extension => compile(extensions, [extension], [])))
  const failed: Record<string, string> = {}
  wanted.forEach(({ id }, index) => {
    const result = alone[index]!
    if (!result.script) failed[id] = result.error ?? ''
  })
  const broken = new Set(Object.keys(failed))
  const problems = broken.size
    ? [...broken].map(id => `Could not build the web extension ${id}:\n${failed[id]}`)
    : [`Could not build the web extensions:\n${error}`]
  const kept = wanted.filter(extension => !broken.has(extension.id) && (broken.size > 0 || extension.builtin))
  const safe = await compile(extensions, kept, problems)
  if (!safe.script) throw new Error(`${problems.join('\n\n')}\n\nThe remaining extensions also failed:\n${safe.error}`)
  return { ...(await stamp(safe.script)), tried: wanted.map(extension => extension.id), bundled: safe.bundled, problems, failed }
}

export const bundle = async (extensions: Extension[]): Promise<Bundle> => {
  const wanted = extensions.filter(extension => extension.builtin || extension.enabled)
  const full = await compile(extensions, wanted, [])
  if (!full.script) return withoutBroken(extensions, wanted, full.error)
  return { ...(await stamp(full.script)), tried: full.bundled, bundled: full.bundled, problems: [], failed: {} }
}
