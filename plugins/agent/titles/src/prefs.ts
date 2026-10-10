import type { Effort } from '@sand/llm-accounts/contract'
import type { TitlePatch, TitleSettings } from './contract'
import { join } from 'node:path'

const efforts: readonly unknown[] = ['low', 'medium', 'high', 'xhigh', 'max'] satisfies Effort[]

const clean = (data: unknown): TitleSettings => {
  const value = typeof data === 'object' && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  return {
    auto: value.auto !== false,
    ...(typeof value.model === 'string' && value.model && { model: value.model }),
    ...(efforts.includes(value.effort) && { effort: value.effort as Effort }),
    ...(value.speed === 'fast' && { speed: 'fast' as const }),
  }
}

export const loadPrefs = async (home: string) => {
  const file = join(home, 'titles.json')
  let saved = clean(await Bun.file(file).json().catch(() => ({})))
  let writing = Promise.resolve()
  const write = async () => {
    await Bun.write(file, `${JSON.stringify(saved, null, 2)}\n`)
  }
  return {
    get: () => saved,
    async save(patch: TitlePatch) {
      saved = clean({ ...saved, ...patch })
      writing = writing.catch(() => {}).then(write)
      await writing
      return saved
    },
  }
}

export type Prefs = Awaited<ReturnType<typeof loadPrefs>>
