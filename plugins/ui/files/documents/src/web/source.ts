import type { OpenFile } from '@sand/file-viewer/contract'
import { bytes } from '@sand/util'
import { Zip } from '@sand/zip'

const MAX_FILE_BYTES = 64 * 1024 * 1024

const boundedBytes = async (file: OpenFile, maxBytes = MAX_FILE_BYTES) => {
  if (file.size > maxBytes) throw new Error(`files up to ${bytes(maxBytes)} can be shown, and this one is ${bytes(file.size)}`)
  return file.bytes()
}

const opened = async (file: OpenFile) => new Zip(await boundedBytes(file))

export { boundedBytes, opened }
