import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { codexHome } from '../server/binary'

export const sessionFiles = async (id: string) => {
  const dir = join(codexHome(), 'sessions')
  if (!existsSync(dir)) return []
  return Array.fromAsync(new Bun.Glob(`**/rollout-*-${id}.jsonl`).scan({ cwd: dir, absolute: true }))
}
