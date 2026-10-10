export interface Dimensions {
  width: number
  height: number
}

const ascii = (bytes: Uint8Array, at: number, text: string) => [...text].every((char, index) => bytes[at + index] === char.charCodeAt(0))

const uint16 = (bytes: Uint8Array, at: number) => (bytes[at]! << 8) | bytes[at + 1]!

const uint24le = (bytes: Uint8Array, at: number) => bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16)

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

const png = (bytes: Uint8Array) =>
  bytes.length >= 24 && ascii(bytes, 1, 'PNG') ? { width: view(bytes).getUint32(16), height: view(bytes).getUint32(20) } : undefined

const gif = (bytes: Uint8Array) =>
  bytes.length >= 10 && ascii(bytes, 0, 'GIF') ? { width: view(bytes).getUint16(6, true), height: view(bytes).getUint16(8, true) } : undefined

const frame = (marker: number) => marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc

const jpeg = (bytes: Uint8Array) => {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined
  let at = 2
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) return undefined
    const marker = bytes[at + 1]!
    if (marker === 0xff) {
      at++
      continue
    }
    if (frame(marker)) return { height: uint16(bytes, at + 5), width: uint16(bytes, at + 7) }
    at += 2 + uint16(bytes, at + 2)
  }
  return undefined
}

const webp = (bytes: Uint8Array) => {
  if (bytes.length < 30 || !ascii(bytes, 0, 'RIFF') || !ascii(bytes, 8, 'WEBP')) return undefined
  if (ascii(bytes, 12, 'VP8X')) return { width: uint24le(bytes, 24) + 1, height: uint24le(bytes, 27) + 1 }
  if (ascii(bytes, 12, 'VP8 ')) return { width: view(bytes).getUint16(26, true) & 0x3fff, height: view(bytes).getUint16(28, true) & 0x3fff }
  if (ascii(bytes, 12, 'VP8L')) {
    const bits = view(bytes).getUint32(21, true)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  return undefined
}

export const dimensions = (bytes: Uint8Array): Dimensions | undefined => png(bytes) ?? jpeg(bytes) ?? gif(bytes) ?? webp(bytes)

export const contentType = (bytes: Uint8Array) => {
  if (ascii(bytes, 1, 'PNG')) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (ascii(bytes, 0, 'GIF')) return 'image/gif'
  if (ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WEBP')) return 'image/webp'
  if (ascii(bytes, 0, '%PDF')) return 'application/pdf'
  return 'application/octet-stream'
}
