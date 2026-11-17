import { serial } from '@sand/util'
import { readState, writeAtomic } from '@sand/util/fs'
import { join } from 'node:path'
import { z } from 'zod'
import type { SessionSettings, SettingsPatch } from './contract'
import { clean } from './settings'

export interface Defaults {
  get(): SessionSettings
  save(patch: SettingsPatch): Promise<void>
}

const readSaved = async (file: string): Promise<SessionSettings> => (await readState(file, data => clean(z.record(z.string(), z.unknown()).safeParse(data).data ?? {}))) ?? {}

export const createDefaults = async (home: string, firstModel: () => string | undefined): Promise<Defaults> => {
  const file = join(home, 'model.json')
  let saved = await readSaved(file)
  const queue = serial()
  const offered = () => {
    const model = firstModel()
    return model ? { ...saved, model } : saved
  }
  return {
    get: () => (saved.model ? saved : offered()),
    async save(patch) {
      saved = clean({ ...saved, ...patch })
      await queue(() => writeAtomic(file, `${JSON.stringify(saved, null, 2)}\n`))
    },
  }
}
