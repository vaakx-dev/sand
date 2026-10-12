export interface ZipEntry {
  name: string
  encrypted: boolean
  method: number
  symlink: boolean
  compressedSize: number
  size: number
  headerOffset: number
}

interface Directory {
  offset: number
  size: number
}

const endSignature = 0x06054b50
const locatorSignature = 0x07064b50
const end64Signature = 0x06064b50
const entrySignature = 0x02014b50
const endSize = 22
const longestComment = 65_535
const unset32 = 0xffffffff
const zip64Field = 0x0001
const symlinkMode = 0o120000

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

const broken = () => new Error('this is not a readable zip file')

const findEnd = (tail: Uint8Array) => {
  const data = view(tail)
  for (let at = tail.length - endSize; at >= 0; at--) if (data.getUint32(at, true) === endSignature) return at
  throw broken()
}

const zip64Directory = async (zip: Bun.BunFile, locatorAt: number): Promise<Directory | undefined> => {
  if (locatorAt < 0) return undefined
  const locator = view(await zip.slice(locatorAt, locatorAt + 20).bytes())
  if (locator.getUint32(0, true) !== locatorSignature) return undefined
  const at = Number(locator.getBigUint64(8, true))
  const end = view(await zip.slice(at, at + 56).bytes())
  if (end.getUint32(0, true) !== end64Signature) throw broken()
  return { size: Number(end.getBigUint64(40, true)), offset: Number(end.getBigUint64(48, true)) }
}

const directoryOf = async (zip: Bun.BunFile): Promise<Directory> => {
  const tailStart = Math.max(0, zip.size - endSize - longestComment)
  const tail = await zip.slice(tailStart).bytes()
  const endAt = findEnd(tail)
  const end = view(tail.subarray(endAt))
  const found = await zip64Directory(zip, tailStart + endAt - 20)
  return found ?? { size: end.getUint32(12, true), offset: end.getUint32(16, true) }
}

const zip64Values = (data: DataView, start: number, length: number) => {
  const values: number[] = []
  for (let at = start; at + 4 <= start + length; ) {
    const id = data.getUint16(at, true)
    const size = data.getUint16(at + 2, true)
    if (id === zip64Field) for (let field = 0; field + 8 <= size; field += 8) values.push(Number(data.getBigUint64(at + 4 + field, true)))
    at += 4 + size
  }
  return values
}

const readEntry = (bytes: Uint8Array, data: DataView, at: number) => {
  if (data.getUint32(at, true) !== entrySignature) throw broken()
  const nameLength = data.getUint16(at + 28, true)
  const extraLength = data.getUint16(at + 30, true)
  const commentLength = data.getUint16(at + 32, true)
  const nameStart = at + 46
  const wide = zip64Values(data, nameStart + nameLength, extraLength)
  const pick = (value: number) => (value === unset32 ? (wide.shift() ?? value) : value)
  const size = pick(data.getUint32(at + 24, true))
  const compressedSize = pick(data.getUint32(at + 20, true))
  const entry: ZipEntry = {
    name: new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLength)),
    encrypted: (data.getUint16(at + 8, true) & 1) === 1,
    method: data.getUint16(at + 10, true),
    symlink: ((data.getUint32(at + 38, true) >>> 16) & 0o170000) === symlinkMode,
    compressedSize,
    size,
    headerOffset: pick(data.getUint32(at + 42, true)),
  }
  return { entry, next: nameStart + nameLength + extraLength + commentLength }
}

export const readCentral = async (zip: Bun.BunFile, limit: number) => {
  const { offset, size } = await directoryOf(zip)
  const bytes = await zip.slice(offset, offset + size).bytes()
  const data = view(bytes)
  const entries: ZipEntry[] = []
  let at = 0
  while (at + 46 <= bytes.length && entries.length < limit) {
    const { entry, next } = readEntry(bytes, data, at)
    entries.push(entry)
    at = next
  }
  return { entries, truncated: at + 46 <= bytes.length }
}
