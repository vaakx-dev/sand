import { damaged, tooManyEntries } from './limits'

interface Directory {
  offset: number
  size: number
  count: number
  end: number
}

interface Central {
  name: string
  flags: number
  method: number
  modified: number
  crc: number
  packed: number
  size: number
  offset: number
}

interface Located extends Central {
  start: number
}

const SIGNATURE = { local: 0x04034b50, central: 0x02014b50, end: 0x06054b50, end64: 0x06064b50, locator64: 0x07064b50 }
const END_BYTES = 22
const MAX_COMMENT_BYTES = 0xffff
const CENTRAL_BYTES = 46
const LOCAL_BYTES = 30
const LOCATOR64_BYTES = 20
const END64_BYTES = 56
const ZIP64_FIELD = 0x0001
const WIDE = 0xffffffff
const WIDE_COUNT = 0xffff

const decoder = new TextDecoder()

const safe = (value: bigint) => {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw damaged('a size or position is out of range')
  return Number(value)
}

const dosTime = (date: number, time: number) => new Date(1980 + (date >> 9), ((date >> 5) & 0xf) - 1, date & 0x1f, time >> 11, (time >> 5) & 0x3f, (time & 0x1f) * 2).getTime()

const endRecord = (view: DataView) => {
  const last = view.byteLength - END_BYTES
  for (let at = last; at >= Math.max(0, last - MAX_COMMENT_BYTES); at--) if (view.getUint32(at, true) === SIGNATURE.end) return at
  throw damaged('its directory is missing')
}

const directory64 = (view: DataView, end: number): Directory => {
  const locator = end - LOCATOR64_BYTES
  if (locator < 0 || view.getUint32(locator, true) !== SIGNATURE.locator64) throw damaged('its ZIP64 directory is missing')
  const record = safe(view.getBigUint64(locator + 8, true))
  if (record + END64_BYTES > locator || view.getUint32(record, true) !== SIGNATURE.end64) throw damaged('its ZIP64 directory is missing')
  return { count: safe(view.getBigUint64(record + 32, true)), size: safe(view.getBigUint64(record + 40, true)), offset: safe(view.getBigUint64(record + 48, true)), end: record }
}

const directoryOf = (view: DataView): Directory => {
  const end = endRecord(view)
  if (view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0) throw new Error("it's split into parts, and only whole archives open")
  const found = { count: view.getUint16(end + 10, true), size: view.getUint32(end + 12, true), offset: view.getUint32(end + 16, true), end }
  return found.count === WIDE_COUNT || found.size === WIDE || found.offset === WIDE ? directory64(view, end) : found
}

const checked = (directory: Directory, maxEntries: number) => {
  if (directory.count > maxEntries) throw tooManyEntries(maxEntries)
  if (directory.offset + directory.size > directory.end) throw damaged('its directory runs past its end')
  if (directory.count * CENTRAL_BYTES > directory.size) throw damaged('it claims more entries than its directory holds')
  return directory
}

const zip64Field = (view: DataView, start: number, end: number) => {
  for (let at = start; at + 4 <= end; at += 4 + view.getUint16(at + 2, true)) if (view.getUint16(at, true) === ZIP64_FIELD) return at + 4
  throw damaged('an entry is missing its ZIP64 sizes')
}

const widened = (view: DataView, extra: { start: number; end: number }, narrow: Pick<Central, 'size' | 'packed' | 'offset'>) => {
  if (narrow.size !== WIDE && narrow.packed !== WIDE && narrow.offset !== WIDE) return narrow
  let at = zip64Field(view, extra.start, extra.end)
  const next = (value: number) => {
    if (value !== WIDE) return value
    if (at + 8 > extra.end) throw damaged('an entry is missing its ZIP64 sizes')
    at += 8
    return safe(view.getBigUint64(at - 8, true))
  }
  const size = next(narrow.size)
  const packed = next(narrow.packed)
  return { size, packed, offset: next(narrow.offset) }
}

const centralRecord = (data: Uint8Array, view: DataView, at: number, stop: number) => {
  if (at + CENTRAL_BYTES > stop || view.getUint32(at, true) !== SIGNATURE.central) throw damaged('its directory has an unreadable entry')
  const nameEnd = at + CENTRAL_BYTES + view.getUint16(at + 28, true)
  const extraEnd = nameEnd + view.getUint16(at + 30, true)
  const next = extraEnd + view.getUint16(at + 32, true)
  if (next > stop) throw damaged('its directory has an unreadable entry')
  const narrow = { packed: view.getUint32(at + 20, true), size: view.getUint32(at + 24, true), offset: view.getUint32(at + 42, true) }
  const record: Central = {
    name: decoder.decode(data.subarray(at + CENTRAL_BYTES, nameEnd)),
    flags: view.getUint16(at + 8, true),
    method: view.getUint16(at + 10, true),
    modified: dosTime(view.getUint16(at + 14, true), view.getUint16(at + 12, true)),
    crc: view.getUint32(at + 16, true),
    ...widened(view, { start: nameEnd, end: extraEnd }, narrow),
  }
  return { record, next }
}

const records = (data: Uint8Array, view: DataView, { offset, size, count }: Directory) => {
  const found: Central[] = []
  for (let at = offset; at < offset + size; ) {
    if (found.length === count) throw damaged('its directory lists more entries than it declares')
    const { record, next } = centralRecord(data, view, at, offset + size)
    found.push(record)
    at = next
  }
  if (found.length !== count) throw damaged('its directory lists fewer entries than it declares')
  return found
}

const located = (view: DataView, directory: Directory, record: Central): Located => {
  const at = record.offset
  if (at + LOCAL_BYTES > directory.offset || view.getUint32(at, true) !== SIGNATURE.local) throw damaged(`${record.name} can't be found`)
  const start = at + LOCAL_BYTES + view.getUint16(at + 26, true) + view.getUint16(at + 28, true)
  if (start + record.packed > directory.offset) throw damaged(`${record.name} runs past the end of the data`)
  return { ...record, start }
}

const dataEnd = (entry: Located) => entry.start + entry.packed

const withoutOverlap = (entries: Located[]) => {
  const ordered = entries.toSorted((first, second) => first.offset - second.offset)
  const overlaps = ordered.slice(1).some((entry, index) => entry.offset < dataEnd(ordered[index]!))
  if (overlaps) throw damaged('its entries overlap, a sign of a zip bomb')
  return entries
}

const isZip = (data: Uint8Array) => data.length >= 4 && [SIGNATURE.local, SIGNATURE.end].includes(new DataView(data.buffer, data.byteOffset, 4).getUint32(0, true))

const entriesOf = (data: Uint8Array, maxEntries: number) => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const directory = checked(directoryOf(view), maxEntries)
  return withoutOverlap(records(data, view, directory).map(record => located(view, directory, record)))
}

export { entriesOf, isZip, SIGNATURE, type Located }
