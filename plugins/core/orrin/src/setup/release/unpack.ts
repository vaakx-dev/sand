import { readZipEntry, zipEntryNames } from '@sand/util/fs'
import { binaryName } from '../binary'

const isBinary = (name: string) => name.split('/').pop() === binaryName

const fromZip = (bytes: Uint8Array<ArrayBuffer>) => {
  const name = zipEntryNames(bytes).find(isBinary)
  return name ? readZipEntry(bytes, name) : undefined
}

const fromTar = async (bytes: Uint8Array<ArrayBuffer>) => {
  const files = await new Bun.Archive(bytes).files()
  const name = [...files.keys()].find(isBinary)
  return name ? files.get(name)!.bytes() : undefined
}

export const unpackBinary = async (archive: string, bytes: Uint8Array<ArrayBuffer>) => {
  const binary = archive.endsWith('.zip') ? fromZip(bytes) : await fromTar(bytes)
  if (!binary) throw new Error(`${archive} has no ${binaryName}`)
  return binary
}
