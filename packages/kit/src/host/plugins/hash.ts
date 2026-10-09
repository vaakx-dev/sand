export const fileHash = (data: Uint8Array | ArrayBuffer | string): string =>
  new Bun.CryptoHasher('sha256').update(data).digest('hex')

export const treeHash = (files: Record<string, string>): string => {
  const hasher = new Bun.CryptoHasher('sha256')
  const paths = Object.keys(files).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  for (const path of paths) hasher.update(`${path}\0${files[path]}\n`)
  return hasher.digest('hex')
}
