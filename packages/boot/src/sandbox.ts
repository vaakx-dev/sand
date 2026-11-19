import { existsSync } from 'node:fs'
import { join } from 'node:path'

const API_KEY_NAME = /_API_KEY$/

const markerFile = (home: string) => join(home, 'sandbox')

export const markSandbox = (home: string) => Bun.write(markerFile(home), '')

export const inSandbox = (home: string) => existsSync(markerFile(home))

export const confineToSandbox = (home: string) => {
  for (const name of Object.keys(process.env)) if (API_KEY_NAME.test(name)) delete process.env[name]
  process.env.CODEX_HOME = join(home, 'codex')
  process.env.CLAUDE_CONFIG_DIR = join(home, 'claude')
}
