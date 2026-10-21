import { removeQuietly } from '@sand/util/fs'
import { chmod, mkdir, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { binaryName, binaryVersion, binFolder, ownBinary } from './binary'

const moveAside = async (path: string) => {
  const old = `${path}.old`
  await removeQuietly(old)
  if (await Bun.file(path).exists()) await rename(path, old)
}

export const placeBinary = async (home: string, binary: Uint8Array) => {
  const path = ownBinary(home)
  const staged = join(binFolder(home), `next-${binaryName}`)
  await mkdir(binFolder(home), { recursive: true })
  await Bun.write(staged, binary)
  if (process.platform !== 'win32') await chmod(staged, 0o755)
  await binaryVersion(staged)
  await moveAside(path)
  await rename(staged, path)
}
