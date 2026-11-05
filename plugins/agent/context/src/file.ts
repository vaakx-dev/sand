import { bytes } from '@sand/util'
import { isMissing, isWithin } from '@sand/util/fs'
import { realpath } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ContextKind } from './contract'

const inlineLimit = 100_000
const utf8 = new TextDecoder('utf-8', { fatal: true })

const existing = (path: string) =>
  realpath(path).catch((error: unknown) => {
    if (isMissing(error)) return undefined
    throw error
  })

const textOf = (data: Uint8Array) => {
  if (data.includes(0)) return undefined
  try {
    return utf8.decode(data)
  } catch {
    return undefined
  }
}

export const fileKind: ContextKind = {
  kind: 'file',
  title: 'File',
  async project({ data }, { cwd }) {
    if (typeof data.path !== 'string' || !data.path) return { unavailable: 'The record has no path.' }
    const path = resolve(cwd, data.path)
    const real = await existing(path)
    if (!real) return { unavailable: 'Not found.' }
    if (!isWithin(real, await realpath(cwd))) return { unavailable: 'Outside the working folder.' }
    const file = Bun.file(real)
    const info = await file.stat()
    if (info.isDirectory()) return { body: `Path: ${path}\nA folder; list it with your tools.` }
    const note = `Path: ${path}\nSize: ${bytes(info.size)}`
    const content = await file.slice(0, inlineLimit + 1).bytes()
    if (content.length > inlineLimit) return { body: `${note}\nToo large to include here; read it with your tools.` }
    const text = textOf(content)
    return text === undefined ? { body: `${note}\nNot a text file; read it with your tools.` } : { body: `${note}\n\n${text}` }
  },
}
