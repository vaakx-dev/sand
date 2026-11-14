import { stat } from 'node:fs/promises'
import { basename } from 'node:path'
import type { FoundFile } from '../contract'

const SNIFFED_BYTES = 8192

const looksLikeText = async (path: string) => !(await Bun.file(path).slice(0, SNIFFED_BYTES).bytes()).includes(0)

const describe = async (path: string): Promise<FoundFile> => {
  const info = await stat(path)
  const modified = Math.floor(info.mtimeMs)
  return { path, name: basename(path), size: info.size, modified, type: Bun.file(path).type, text: await looksLikeText(path) }
}

export { describe }
