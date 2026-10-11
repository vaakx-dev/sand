import { isRecord, serial } from '@sand/kit'
import { join } from 'node:path'
import type { SessionSettings, SettingsPatch } from './contract'
import { clean } from './settings'

export interface Defaults {
  get(): SessionSettings
  save(patch: SettingsPatch): Promise<void>
}

const readSaved = async (file: string): Promise<SessionSettings> => {
  try {
    const data: unknown = await Bun.file(file).json()
    return isRecord(data) ? clean(data) : {}
  } catch {
    return {}
  }
}

export const createDefaults = async (home: string, fallback: () => SessionSettings): Promise<Defaults> => {
  const file = join(home, 'model.json')
  let saved = await readSaved(file)
  const queue = serial()
  return {
    get: () => ({ ...fallback(), ...saved }),
    async save(patch) {
      saved = clean({ ...saved, ...patch })
      await queue(() => Bun.write(file, `${JSON.stringify(saved, null, 2)}\n`))
    },
  }
}
