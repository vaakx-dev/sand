import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const sessionFiles = (home: string) => async (id: string) => {
  const dir = join(home, 'sessions')
  if (!existsSync(dir)) return []
  return Array.fromAsync(new Bun.Glob(`**/rollout-*-${id}.jsonl`).scan({ cwd: dir, absolute: true }))
}
