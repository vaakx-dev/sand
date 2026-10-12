import { join } from 'node:path'
import type { Budget } from './budget'
import { safeEntryPath } from './entry-path'

const maxInMemory = 1024 ** 3

const unpackedSize = async (path: string) => {
  if (path.toLowerCase().endsWith('.tar')) return Bun.file(path).size
  let size = 0
  const unpacked = Bun.file(path).stream().pipeThrough(new DecompressionStream('gzip'))
  await unpacked.pipeTo(new WritableStream({ write: chunk => void (size += chunk.length) }))
  return size
}

export const untar = async (path: string, folder: string, budget: Budget) => {
  if ((await unpackedSize(path)) > maxInMemory) return ['the archive is over 1 GB unpacked, so it was left packed']
  const files = await new Bun.Archive(await Bun.file(path).bytes()).files()
  const notes: string[] = []
  for (const [name, file] of files) {
    const relative = safeEntryPath(name)
    if (!relative) {
      notes.push(`${name} (unsafe path)`)
      continue
    }
    budget.take(file.size)
    await Bun.write(join(folder, relative), file)
  }
  return notes
}
