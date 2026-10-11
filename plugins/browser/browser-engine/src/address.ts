import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

const port = /^:?(\d{2,5})(\/.*)?$/
const drive = /^[a-zA-Z]:[\\/]/
const scheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/
const local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/.*)?$/
const pathLike = /^(\.{1,2}[\\/]|~[\\/]|[\\/])/

const filePath = (text: string, cwd: string | undefined) => {
  if (text.startsWith('~')) return join(homedir(), text.slice(2))
  if (drive.test(text) || isAbsolute(text)) return text
  return cwd ? resolve(cwd, text) : undefined
}

const existingFile = (text: string, cwd: string | undefined) => {
  const path = filePath(text, cwd)
  return path && existsSync(path) ? Bun.pathToFileURL(path).href : undefined
}

export const addressOf = (input: string, cwd?: string) => {
  const text = input.trim()
  const onPort = port.exec(text)
  if (onPort) return `http://localhost:${onPort[1]}${onPort[2] ?? ''}`
  if (local.test(text)) return `http://${text}`
  if (drive.test(text) || pathLike.test(text)) {
    const file = existingFile(text, cwd)
    if (!file) throw new Error(`No file at ${text}`)
    return file
  }
  if (scheme.test(text)) return text
  const relative = existingFile(text, cwd)
  if (relative) return relative
  if (text.includes('.') && !/\s/.test(text)) return `https://${text}`
  return `https://duckduckgo.com/?q=${encodeURIComponent(text)}`
}
