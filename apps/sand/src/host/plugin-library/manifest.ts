import type { PluginCustomised } from '@sand/protocol'
import { join } from 'node:path'

type Json = Record<string, unknown>

const isJson = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value)

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)

const readJson = async (folder: string): Promise<Json | undefined> => {
  const data: unknown = await Bun.file(join(folder, 'package.json')).json().catch(() => undefined)
  return isJson(data) ? data : undefined
}

const record = (value: unknown): PluginCustomised | undefined => {
  if (!isJson(value)) return undefined
  const { version, build, hash, time } = value
  if (typeof hash !== 'string' || !hash) return undefined
  return { version: text(version) ?? '', build: text(build) ?? '', hash, time: typeof time === 'number' ? time : 0 }
}

export interface PluginManifestInfo {
  label?: string
  description?: string
  from?: PluginCustomised
  dependencies: string[]
}

export const readManifest = async (folder: string): Promise<PluginManifestInfo | undefined> => {
  const data = await readJson(folder)
  if (!data) return undefined
  const sand = isJson(data.sand) ? data.sand : {}
  return {
    label: text(sand.label),
    description: text(data.description) ?? text(sand.summary),
    from: record(sand.customised),
    dependencies: isJson(data.dependencies) ? Object.keys(data.dependencies) : [],
  }
}

export const writeCustomised = async (folder: string, from: PluginCustomised) => {
  const data = (await readJson(folder)) ?? {}
  const sand = isJson(data.sand) ? data.sand : {}
  const next = { ...data, sand: { ...sand, customised: from } }
  await Bun.write(join(folder, 'package.json'), `${JSON.stringify(next, null, 2)}\n`)
}
