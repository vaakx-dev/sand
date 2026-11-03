import { isRecord, serial } from '@sand/util'
import { join } from 'node:path'

export const loadSettleSetting = async (home: string) => {
  const file = join(home, 'pull-links.json')
  const saved: unknown = await Bun.file(file)
    .json()
    .catch(() => ({}))
  let on = !(isRecord(saved) && saved.autoSettle === false)
  const queue = serial()
  return {
    on: () => on,
    async set(next: boolean) {
      on = next
      await queue(() => Bun.write(file, `${JSON.stringify({ autoSettle: next }, null, 2)}\n`))
    },
  }
}

export type SettleSetting = Awaited<ReturnType<typeof loadSettleSetting>>
