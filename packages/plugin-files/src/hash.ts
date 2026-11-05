import { compare } from '@sand/util'

export const treeHash = (files: Record<string, string>): string => {
  const hasher = new Bun.CryptoHasher('sha256')
  for (const path of Object.keys(files).sort(compare)) hasher.update(`${path}\0${files[path]}\n`)
  return hasher.digest('hex')
}
