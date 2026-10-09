const endSignature = 0x06054b50
const centralSignature = 0x02014b50
const localSignature = 0x04034b50
const endSize = 22
const maxComment = 0xffff

interface ZipEntry {
  method: number
  flags: number
  crc: number
  compressed: number
  size: number
  local: number
}

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

const findEnd = (data: DataView) => {
  const last = data.byteLength - endSize
  const first = Math.max(0, last - maxComment)
  for (let at = last; at >= first; at--) if (data.getUint32(at, true) === endSignature) return at
  throw new Error('the Bun download is not a zip file')
}

const readEntry = (data: DataView, at: number): ZipEntry => ({
  flags: data.getUint16(at + 8, true),
  method: data.getUint16(at + 10, true),
  crc: data.getUint32(at + 16, true),
  compressed: data.getUint32(at + 20, true),
  size: data.getUint32(at + 24, true),
  local: data.getUint32(at + 42, true),
})

const findEntry = (bytes: Uint8Array, name: string): ZipEntry | undefined => {
  const data = view(bytes)
  const end = findEnd(data)
  const count = data.getUint16(end + 10, true)
  let at = data.getUint32(end + 16, true)
  if (count === 0xffff || at === 0xffffffff) throw new Error('zip64 archives are not supported')
  const decoder = new TextDecoder()
  for (let index = 0; index < count; index++) {
    if (at + 46 > data.byteLength || data.getUint32(at, true) !== centralSignature) throw new Error('the zip directory is damaged')
    const nameLength = data.getUint16(at + 28, true)
    const extraLength = data.getUint16(at + 30, true)
    const commentLength = data.getUint16(at + 32, true)
    const entryName = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength))
    if (entryName === name) return readEntry(data, at)
    at += 46 + nameLength + extraLength + commentLength
  }
}

const entryData = (bytes: Uint8Array<ArrayBuffer>, entry: ZipEntry) => {
  const data = view(bytes)
  if (entry.local + 30 > data.byteLength || data.getUint32(entry.local, true) !== localSignature) throw new Error('the zip entry is damaged')
  const start = entry.local + 30 + data.getUint16(entry.local + 26, true) + data.getUint16(entry.local + 28, true)
  if (start + entry.compressed > data.byteLength) throw new Error('the zip entry is cut short')
  return bytes.subarray(start, start + entry.compressed)
}

const unpack = (raw: Uint8Array<ArrayBuffer>, method: number) => {
  if (method === 0) return raw
  if (method === 8) return Bun.inflateSync(raw)
  throw new Error(`zip compression method ${method} is not supported`)
}

export const readZipEntry = (bytes: Uint8Array<ArrayBuffer>, name: string): Uint8Array<ArrayBuffer> => {
  const entry = findEntry(bytes, name)
  if (!entry) throw new Error(`${name} is missing from the zip`)
  if (entry.compressed === 0xffffffff || entry.size === 0xffffffff || entry.local === 0xffffffff) throw new Error('zip64 archives are not supported')
  if (entry.flags & 1) throw new Error('encrypted zip entries are not supported')
  const content = unpack(entryData(bytes, entry), entry.method)
  if (content.byteLength !== entry.size) throw new Error(`${name} has the wrong size in the zip`)
  if (Bun.hash.crc32(content) >>> 0 !== entry.crc) throw new Error(`${name} failed its zip checksum`)
  return content
}
