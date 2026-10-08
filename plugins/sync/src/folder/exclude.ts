import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Hidden } from './hidden'
import { isGitFolder } from './stat'

export const secretPatterns = ['.env', '.env.*', '*.pem', '*.key', 'id_rsa*', 'id_ed25519*']

export const junkPatterns = ['node_modules/', '.DS_Store', 'Thumbs.db', '__pycache__/', '.venv/']

export const writeExclude = async (hidden: Hidden) => {
  const patterns = ['/.git', ...secretPatterns, ...((await isGitFolder(hidden.folder)) ? [] : junkPatterns)]
  const info = join(hidden.gitDir, 'info')
  await mkdir(info, { recursive: true })
  const text = `${patterns.join('\n')}\n`
  const target = Bun.file(join(info, 'exclude'))
  if ((await target.text().catch(() => '')) !== text) await Bun.write(target, text)
}

const secretNames = secretPatterns.map(pattern => new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`))

export const isSecret = (name: string) => secretNames.some(pattern => pattern.test(name))
