import { isRecord } from '@sand/util'
import { writeAtomic } from '@sand/util/fs'

const header = /^\s*\[\s*features\s*\]\s*(#.*)?$/
const anyHeader = /^\s*\[/
const keyOf = (line: string) => line.match(/^\s*"?([\w-]+)"?\s*=/)?.[1]

const edited = (text: string, changes: Record<string, boolean>) => {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.length ? text.split(/\r?\n/) : []
  let start = lines.findIndex(line => header.test(line))
  if (start < 0) {
    while (lines.length && !lines.at(-1)!.trim()) lines.pop()
    if (lines.length) lines.push('')
    lines.push('[features]')
    start = lines.length - 1
  }
  const next = lines.findIndex((line, index) => index > start && anyHeader.test(line))
  const end = next < 0 ? lines.length : next
  const kept = lines.slice(start + 1, end).filter(line => {
    const key = keyOf(line)
    return key === undefined || !(key in changes)
  })
  while (kept.length && !kept.at(-1)!.trim()) kept.pop()
  const off = Object.entries(changes).flatMap(([id, on]) => (on ? [] : [`${id} = false`]))
  const section = [...kept, ...off, ...(next < 0 ? [] : [''])]
  return [...lines.slice(0, start + 1), ...section, ...lines.slice(end)].join(eol).replace(/\s*$/, eol)
}

const matches = (text: string, changes: Record<string, boolean>) => {
  const { features } = Bun.TOML.parse(text) as Record<string, unknown>
  const table = isRecord(features) ? features : {}
  return Object.entries(changes).every(([id, on]) => (on ? !(id in table) : table[id] === false))
}

export const writeFeatures = async (path: string, changes: Record<string, boolean>) => {
  const file = Bun.file(path)
  const text = edited((await file.exists()) ? await file.text() : '', changes)
  if (!matches(text, changes)) throw new Error(`Couldn't update [features] in ${path}; set them there by hand`)
  await writeAtomic(path, text)
}
