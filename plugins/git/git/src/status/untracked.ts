import { join } from 'node:path'
import type { GitFile } from '../contract'

const maxFiles = 300
const maxFileBytes = 256 * 1024
const maxTotalBytes = 4 * 1024 * 1024
const sniffBytes = 8000
const newline = 10

const linesOf = (bytes: Uint8Array) => {
  if (bytes.subarray(0, sniffBytes).includes(0)) return undefined
  let lines = 0
  for (const byte of bytes) if (byte === newline) lines++
  return bytes.length && bytes[bytes.length - 1] !== newline ? lines + 1 : lines
}

const countFile = async (root: string, file: GitFile): Promise<GitFile> => {
  try {
    const lines = linesOf(await Bun.file(join(root, file.path)).bytes())
    return lines === undefined ? { ...file, binary: true } : { ...file, add: lines }
  } catch {
    return file
  }
}

const pickCountable = (root: string, files: GitFile[]) => {
  const picked = new Set<GitFile>()
  let budget = maxTotalBytes
  for (const file of files) {
    if (picked.size >= maxFiles) break
    if (file.kind !== 'untracked') continue
    const size = Bun.file(join(root, file.path)).size
    if (size > maxFileBytes || size > budget) continue
    budget -= size
    picked.add(file)
  }
  return picked
}

export const countUntracked = (root: string, files: GitFile[]): Promise<GitFile[]> => {
  const picked = pickCountable(root, files)
  return Promise.all(files.map(file => (picked.has(file) ? countFile(root, file) : file)))
}
