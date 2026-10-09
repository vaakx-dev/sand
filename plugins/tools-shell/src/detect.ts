import { existsSync } from 'node:fs'
import { basename, win32 } from 'node:path'

export interface Shell {
  name: string
  argv(command: string): string[]
  verbatim?: boolean
}

const utf8 = '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;'

const isSystem32 = (path: string) => /[\\/]system32[\\/]/i.test(path)

const installRoots = () => {
  const { ProgramFiles, ProgramW6432, LOCALAPPDATA } = process.env
  const local = LOCALAPPDATA ? win32.join(LOCALAPPDATA, 'Programs') : undefined
  return [ProgramFiles, ProgramW6432, local].filter(root => root !== undefined).map(root => win32.join(root, 'Git'))
}

const gitRoots = () => {
  const git = Bun.which('git')
  if (!git) return []
  const folder = win32.dirname(git)
  return [win32.dirname(folder), win32.dirname(win32.dirname(folder))]
}

const gitBash = () =>
  [...installRoots(), ...gitRoots()]
    .map(root => win32.join(root, 'bin', 'bash.exe'))
    .find(path => !isSystem32(path) && existsSync(path))

const fallback = () => {
  if (process.platform !== 'win32') return process.env.SHELL ?? '/bin/bash'
  return gitBash() ?? Bun.which('pwsh') ?? 'powershell'
}

export const detect = (configured?: string): Shell => {
  const path = configured ?? fallback()
  if (/powershell|pwsh/i.test(path)) {
    return { name: 'PowerShell', argv: command => [path, '-NoProfile', '-NonInteractive', '-Command', utf8 + command] }
  }
  if (/(^|[\\/])cmd(\.exe)?$/i.test(path)) {
    return { name: 'cmd', verbatim: true, argv: command => [path, '/d', '/s', '/c', `"chcp 65001 >nul & ${command}"`] }
  }
  return { name: basename(path).replace(/\.exe$/i, ''), argv: command => [path, '-c', command] }
}
