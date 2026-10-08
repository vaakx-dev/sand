import { existsSync } from 'node:fs'
import { basename } from 'node:path'

export interface Shell {
  name: string
  argv(command: string): string[]
}

const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe'

const fallback = () => {
  if (process.platform !== 'win32') return process.env.SHELL ?? '/bin/bash'
  return existsSync(gitBash) ? gitBash : 'powershell'
}

export const detect = (configured?: string): Shell => {
  const path = configured ?? fallback()
  if (/powershell|pwsh/i.test(path)) {
    return { name: 'PowerShell', argv: command => [path, '-NoProfile', '-NonInteractive', '-Command', command] }
  }
  return { name: basename(path).replace(/\.exe$/i, ''), argv: command => [path, '-c', command] }
}
