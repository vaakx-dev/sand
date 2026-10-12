import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Budget } from '../budget'
import { safeEntryPath } from '../entry-path'
import { readCentral, type ZipEntry } from './central'

const maxEntries = 20_000
const localSignature = 0x04034b50
const stored = 0
const deflated = 8

const dataStart = async (zip: Bun.BunFile, entry: ZipEntry) => {
  const header = await zip.slice(entry.headerOffset, entry.headerOffset + 30).bytes()
  const data = new DataView(header.buffer, header.byteOffset, header.byteLength)
  if (header.length < 30 || data.getUint32(0, true) !== localSignature) throw new Error('its local header is broken')
  return entry.headerOffset + 30 + data.getUint16(26, true) + data.getUint16(28, true)
}

const contents = async (zip: Bun.BunFile, entry: ZipEntry) => {
  const start = await dataStart(zip, entry)
  const raw = zip.slice(start, start + entry.compressedSize).stream()
  return entry.method === stored ? raw : raw.pipeThrough(new DecompressionStream('deflate-raw'))
}

const skipReason = (entry: ZipEntry) => {
  if (entry.encrypted) return 'encrypted'
  if (entry.symlink) return 'a symbolic link'
  if (entry.method !== stored && entry.method !== deflated) return `compressed with an unsupported method (${entry.method})`
  return undefined
}

const extractEntry = async (zip: Bun.BunFile, entry: ZipEntry, target: string, budget: Budget) => {
  await mkdir(dirname(target), { recursive: true })
  const writer = Bun.file(target).writer({ highWaterMark: 1024 ** 2 })
  try {
    for await (const chunk of await contents(zip, entry)) {
      budget.take(chunk.length)
      await writer.write(chunk)
    }
  } finally {
    await writer.end()
  }
}

export const unzip = async (path: string, folder: string, budget: Budget) => {
  const zip = Bun.file(path)
  const { entries, truncated } = await readCentral(zip, maxEntries)
  const notes: string[] = truncated ? [`only the first ${maxEntries} entries were unpacked`] : []
  for (const entry of entries) {
    const relative = safeEntryPath(entry.name)
    if (!relative) {
      notes.push(`${entry.name} (unsafe path)`)
      continue
    }
    const target = join(folder, relative)
    if (entry.name.endsWith('/')) {
      await mkdir(target, { recursive: true })
      continue
    }
    const reason = skipReason(entry)
    if (reason) {
      notes.push(`${entry.name} (${reason})`)
      continue
    }
    try {
      await extractEntry(zip, entry, target, budget)
    } catch (error) {
      notes.push(`${entry.name} (${error instanceof Error ? error.message : String(error)})`)
      if (budget.spent()) break
    }
  }
  return notes
}
