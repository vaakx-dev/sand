import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import { isRecord, serial } from '@sand/kit'
import { join } from 'node:path'

const clean = (settings: SettingsPatch): SessionSettings =>
  Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined && value !== null))

const changes = (patch: SettingsPatch): SettingsPatch => Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))

const readSaved = async (file: string): Promise<SessionSettings> => {
  const data: unknown = await Bun.file(file)
    .json()
    .catch(() => ({}))
  return isRecord(data) ? clean(data) : {}
}

export const workerStore = async (home: string) => {
  const file = join(home, 'worker-model.json')
  let saved = await readSaved(file)
  const queue = serial()
  return {
    get: () => saved,
    async save(patch: SettingsPatch) {
      saved = clean({ ...saved, ...changes(patch) })
      await queue(() => Bun.write(file, `${JSON.stringify(saved, null, 2)}\n`))
      return saved
    },
  }
}
