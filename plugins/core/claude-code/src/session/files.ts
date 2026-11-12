import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const projectsDir = () => join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects')

export const sessionFiles = async (id: string) => {
  const dir = projectsDir()
  if (!existsSync(dir)) return []
  return Array.fromAsync(new Bun.Glob(`*/${id}.jsonl`).scan({ cwd: dir, absolute: true }))
}
