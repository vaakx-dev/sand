import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const projectsDir = (config?: string) => join(config ?? (process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')), 'projects')

export const sessionFiles = async (id: string, config?: string) => {
  const dir = projectsDir(config)
  if (!existsSync(dir)) return []
  return Array.fromAsync(new Bun.Glob(`*/${id}.jsonl`).scan({ cwd: dir, absolute: true }))
}
