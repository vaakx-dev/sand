import { dirname, join } from 'node:path'
import type { Extension } from '../extensions/discover'
import { manifestSource, virtualModules } from './virtual'

export interface Bundle {
  id: string
  script: string
  tried: string[]
  bundled: string[]
  problems: string[]
}

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

const compile = async (id: string, extensions: Extension[], bundled: Extension[], problems: string[]) => {
  const output = await Bun.build({
    entrypoints: [join(import.meta.dir, '..', 'boot', 'index.ts')],
    target: 'browser',
    conditions: ['browser'],
    minify: { whitespace: true, syntax: true, identifiers: false },
    plugins: [virtualModules(manifestSource(id, extensions, bundled, problems), shared())],
    throw: false,
  })
  if (!output.success) return { error: output.logs.map(String).join('\n') }
  return { script: await output.outputs[0]!.text(), bundled: bundled.map(extension => extension.id) }
}

export const bundle = async (extensions: Extension[]): Promise<Bundle> => {
  const id = Bun.randomUUIDv7()
  const wanted = extensions.filter(extension => extension.builtin || extension.enabled)
  const full = await compile(id, extensions, wanted, [])
  if (full.script) return { id, script: full.script, tried: full.bundled, bundled: full.bundled, problems: [] }
  const alone = await Promise.all(wanted.map(extension => compile(id, extensions, [extension], [])))
  const broken = new Set(wanted.filter((_, index) => !alone[index]!.script))
  const problems = broken.size
    ? wanted.flatMap((extension, index) => (broken.has(extension) ? [`Could not build the web extension ${extension.id}:\n${alone[index]!.error}`] : []))
    : [`Could not build the web extensions:\n${full.error}`]
  const safe = await compile(id, extensions, wanted.filter(extension => !broken.has(extension) && (broken.size > 0 || extension.builtin)), problems)
  if (safe.script) return { id, script: safe.script, tried: wanted.map(extension => extension.id), bundled: safe.bundled, problems }
  throw new Error(`${problems.join('\n\n')}\n\nThe remaining extensions also failed:\n${safe.error}`)
}
