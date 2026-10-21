export const fileHash = (data: Uint8Array | ArrayBuffer | string): string =>
  new Bun.CryptoHasher('sha256').update(data).digest('hex')
