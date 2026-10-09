import type { SessionSettings, SettingsPatch } from '@sand/protocol'
import { join } from 'node:path'
import { clean } from './settings'

export interface Defaults {
  get(): SessionSettings
  save(patch: SettingsPatch): Promise<void>
}

const readSaved = async (file: string): Promise<SessionSettings> => {
  try {
    const data: unknown = await Bun.file(file).json()
    return typeof data === 'object' && data !== null && !Array.isArray(data) ? clean(data) : {}
  } catch {
    return {}
  }
}

export const createDefaults = async (home: string, fallback: () => SessionSettings): Promise<Defaults> => {
  const file = join(home, 'model.json')
  let saved = await readSaved(file)
  let writing = Promise.resolve()
  const write = async () => {
    await Bun.write(file, `${JSON.stringify(saved, null, 2)}\n`)
  }
  return {
    get: () => ({ ...fallback(), ...saved }),
    async save(patch) {
      saved = clean({ ...saved, ...patch })
      writing = writing.then(write)
      await writing
    },
  }
}
