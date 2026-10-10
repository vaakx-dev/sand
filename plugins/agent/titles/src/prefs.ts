import type { Effort } from '@sand/llm-accounts/contract'
import { isRecord, serial } from '@sand/kit'
import { join } from 'node:path'
import type { TitlePatch, TitleSettings } from './contract'

const efforts: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

const isEffort = (value: unknown): value is Effort => efforts.some(effort => effort === value)

const clean = (data: unknown): TitleSettings => {
  const value = isRecord(data) ? data : {}
  return {
    auto: value.auto !== false,
    ...(typeof value.model === 'string' && value.model && { model: value.model }),
    ...(isEffort(value.effort) && { effort: value.effort }),
    ...(value.speed === 'fast' && { speed: 'fast' as const }),
  }
}

export const loadPrefs = async (home: string) => {
  const file = join(home, 'titles.json')
  let saved = clean(await Bun.file(file).json().catch(() => ({})))
  const queue = serial()
  const write = async () => {
    await Bun.write(file, `${JSON.stringify(saved, null, 2)}\n`)
  }
  return {
    get: () => saved,
    async save(patch: TitlePatch) {
      saved = clean({ ...saved, ...patch })
      await queue(write)
      return saved
    },
  }
}

export type Prefs = Awaited<ReturnType<typeof loadPrefs>>
