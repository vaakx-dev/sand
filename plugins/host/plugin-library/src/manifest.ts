import { join } from 'node:path'
import { z } from 'zod'
import type { PluginCustomised } from './contract'

const text = z
  .string()
  .transform(value => value.trim() || undefined)
  .catch(undefined)

const customised = z
  .object({
    version: text,
    build: text,
    hash: z.string().min(1),
    time: z.number().catch(0),
  })
  .transform(({ version, build, hash, time }): PluginCustomised => ({ version: version ?? '', build: build ?? '', hash, time }))
  .optional()
  .catch(undefined)

const manifest = z.object({
  description: text,
  dependencies: z
    .record(z.string(), z.unknown())
    .transform(dependencies => Object.keys(dependencies))
    .catch([]),
  sand: z
    .object({ label: text, summary: text, customised })
    .catch({ label: undefined, summary: undefined, customised: undefined }),
})

const editable = z.looseObject({ sand: z.looseObject({}).catch({}) })

const readJson = async (folder: string): Promise<unknown> => await Bun.file(join(folder, 'package.json')).json().catch(() => undefined)

export interface PluginManifestInfo {
  label?: string
  description?: string
  from?: PluginCustomised
  dependencies: string[]
}

export const readManifest = async (folder: string): Promise<PluginManifestInfo | undefined> => {
  const parsed = manifest.safeParse(await readJson(folder))
  if (!parsed.success) return undefined
  const { description, dependencies, sand } = parsed.data
  return { label: sand.label, description: description ?? sand.summary, from: sand.customised, dependencies }
}

export const writeCustomised = async (folder: string, from: PluginCustomised) => {
  const data = editable.safeParse(await readJson(folder)).data ?? { sand: {} }
  const next = { ...data, sand: { ...data.sand, customised: from } }
  await Bun.write(join(folder, 'package.json'), `${JSON.stringify(next, null, 2)}\n`)
}
