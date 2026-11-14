import { inflate } from '@sand/zip'

interface FontNames {
  family?: string
  style?: string
  version?: string
  copyright?: string
}

interface Table {
  offset: number
  length: number
  unpacked: number
}

interface NameRecord {
  platform: number
  encoding: number
  language: number
  id: number
  length: number
  offset: number
}

const SFNT_VERSIONS = new Set([0x00010000, 0x4f54544f, 0x74727565])
const WOFF = 0x774f4646
const NAME_TAG = 0x6e616d65
const SFNT_RECORD_BYTES = 16
const WOFF_RECORD_BYTES = 20
const WOFF_HEADER_BYTES = 44
const NAME_RECORD_BYTES = 12
const MAX_NAME_BYTES = 1024 * 1024
const NAME_ID = { copyright: 0, family: 1, style: 2, version: 5, typographicFamily: 16, typographicStyle: 17 }
const PLATFORM = { unicode: 0, mac: 1, windows: 3 }
const MAC_ROMAN = 0
const ENGLISH_US = 0x409

const tableIn = (view: DataView, { count, start, size }: { count: number; start: number; size: number }, read: (at: number) => Table) => {
  const records = Array.from({ length: count }, (_, index) => start + index * size)
  const record = records.find(at => at + size <= view.byteLength && view.getUint32(at) === NAME_TAG)
  return record === undefined ? undefined : read(record)
}

const nameTable = (view: DataView): Table | undefined => {
  if (view.byteLength < WOFF_HEADER_BYTES) return undefined
  const signature = view.getUint32(0)
  if (SFNT_VERSIONS.has(signature)) {
    const count = view.getUint16(4)
    return tableIn(view, { count, start: 12, size: SFNT_RECORD_BYTES }, at => ({ offset: view.getUint32(at + 8), length: view.getUint32(at + 12), unpacked: view.getUint32(at + 12) }))
  }
  if (signature !== WOFF) return undefined
  const count = view.getUint16(12)
  return tableIn(view, { count, start: WOFF_HEADER_BYTES, size: WOFF_RECORD_BYTES }, at => ({ offset: view.getUint32(at + 4), length: view.getUint32(at + 8), unpacked: view.getUint32(at + 12) }))
}

const tableBytes = (bytes: Uint8Array<ArrayBuffer>, { offset, length, unpacked }: Table) => {
  if (offset + length > bytes.length || unpacked > MAX_NAME_BYTES) return undefined
  const packed = bytes.subarray(offset, offset + length)
  return length < unpacked ? inflate(packed, 'deflate', unpacked).catch(() => undefined) : packed
}

const recordsOf = (view: DataView) => {
  const count = view.getUint16(2)
  const starts = Array.from({ length: count }, (_, index) => 6 + index * NAME_RECORD_BYTES).filter(at => at + NAME_RECORD_BYTES <= view.byteLength)
  return starts.map(at => ({
    platform: view.getUint16(at),
    encoding: view.getUint16(at + 2),
    language: view.getUint16(at + 4),
    id: view.getUint16(at + 6),
    length: view.getUint16(at + 8),
    offset: view.getUint16(at + 10),
  }))
}

const rankOf = ({ platform, encoding, language }: NameRecord) => {
  if (platform === PLATFORM.windows) return language === ENGLISH_US ? 0 : 1
  if (platform === PLATFORM.unicode) return 2
  if (platform === PLATFORM.mac && encoding === MAC_ROMAN) return 3
  return undefined
}

const textOf = (table: Uint8Array, stringsAt: number, record: NameRecord) => {
  const start = stringsAt + record.offset
  if (start + record.length > table.length) return undefined
  const decoder = new TextDecoder(record.platform === PLATFORM.mac ? 'macintosh' : 'utf-16be')
  return decoder.decode(table.subarray(start, start + record.length)).trim() || undefined
}

const namesIn = (table: Uint8Array): FontNames => {
  if (table.length < 6) return {}
  const view = new DataView(table.buffer, table.byteOffset, table.byteLength)
  const stringsAt = view.getUint16(4)
  const ranked = recordsOf(view).filter(record => rankOf(record) !== undefined)
  const name = (...ids: number[]) =>
    ids
      .map(id => ranked.filter(record => record.id === id).sort((one, other) => rankOf(one)! - rankOf(other)!)[0])
      .map(record => record && textOf(table, stringsAt, record))
      .find(Boolean)
  return {
    family: name(NAME_ID.typographicFamily, NAME_ID.family),
    style: name(NAME_ID.typographicStyle, NAME_ID.style),
    version: name(NAME_ID.version)?.split(';')[0],
    copyright: name(NAME_ID.copyright),
  }
}

const fontNames = async (bytes: Uint8Array<ArrayBuffer>): Promise<FontNames> => {
  const table = nameTable(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength))
  const found = table && (await tableBytes(bytes, table))
  return found ? namesIn(found) : {}
}

export { fontNames, type FontNames }
