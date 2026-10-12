export const largeBlob = 4 * 1024 * 1024

export const streamedBlob = 64 * 1024 * 1024

const offThread = 1024 * 1024

export interface Encoded {
  bytes: Uint8Array
  compressed: boolean
}

export const hashOf = (bytes: Uint8Array) => new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

export const digestOf = async (bytes: Uint8Array<ArrayBuffer>) => {
  if (bytes.length < offThread) return hashOf(bytes)
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)).toHex()
}

export const hashBlob = async (blob: Blob) => {
  if (blob.size <= streamedBlob) return digestOf(await blob.bytes())
  const hasher = new Bun.CryptoHasher('sha256')
  for await (const chunk of blob.stream()) hasher.update(chunk)
  return hasher.digest('hex')
}

export const encode = async (bytes: Uint8Array): Promise<Encoded> => {
  if (bytes.length < 64 || bytes.length > largeBlob) return { bytes, compressed: false }
  const packed = await Bun.zstdCompress(bytes)
  return packed.length < bytes.length ? { bytes: packed, compressed: true } : { bytes, compressed: false }
}

export const decode = ({ bytes, compressed }: Encoded) => (compressed ? Bun.zstdDecompressSync(bytes) : bytes)
