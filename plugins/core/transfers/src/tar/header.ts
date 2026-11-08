export const block = 512

export type EntryType = 'file' | 'folder' | 'link'

export interface Entry {
  name: string
  type: EntryType
  mode: number
  size: number
  mtime: number
  link: string
}

export interface Header {
  name: string
  flag: string
  mode: number
  size: number
  mtime: number
  link: string
}

export type Pax = Partial<Record<'path' | 'linkpath' | 'size', string>>

const flags: Record<EntryType, string> = { file: '0', folder: '5', link: '2' }

const maxOctal = 0o77777777777

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const padding = (size: number) => (block - (size % block)) % block

const putText = (header: Uint8Array, offset: number, length: number, text: string) => header.set(encoder.encode(text).subarray(0, length), offset)

const putOctal = (header: Uint8Array, offset: number, length: number, value: number) => putText(header, offset, length, value.toString(8).padStart(length - 1, '0'))

const checksum = (header: Uint8Array) => header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0)

const headerOf = (name: string, flag: string, mode: number, size: number, mtime: number, link: string) => {
  const header = new Uint8Array(block)
  putText(header, 0, 100, name)
  putOctal(header, 100, 8, mode)
  putOctal(header, 108, 8, 0)
  putOctal(header, 116, 8, 0)
  putOctal(header, 124, 12, size > maxOctal ? 0 : size)
  putOctal(header, 136, 12, mtime)
  putText(header, 156, 1, flag)
  putText(header, 157, 100, link)
  putText(header, 257, 8, 'ustar\u000000')
  putText(header, 148, 8, `${checksum(header).toString(8).padStart(6, '0')}\u0000 `)
  return header
}

const paxRecord = (key: string, value: string) => {
  const body = ` ${key}=${value}\n`
  const bytes = encoder.encode(body).length
  const guess = bytes + String(bytes).length
  return `${bytes + String(guess).length}${body}`
}

const paxOf = ({ name, link, size }: Entry) =>
  [
    encoder.encode(name).length > 100 ? paxRecord('path', name) : '',
    encoder.encode(link).length > 100 ? paxRecord('linkpath', link) : '',
    size > maxOctal ? paxRecord('size', String(size)) : '',
  ].join('')

const padded = (bytes: Uint8Array) => {
  const out = new Uint8Array(bytes.length + padding(bytes.length))
  out.set(bytes)
  return out
}

export const headersOf = (entry: Entry) => {
  const name = entry.type === 'folder' ? `${entry.name}/` : entry.name
  const main = headerOf(name, flags[entry.type], entry.mode, entry.size, entry.mtime, entry.link)
  const pax = paxOf({ ...entry, name })
  if (!pax) return [main]
  const body = encoder.encode(pax)
  return [headerOf('PaxHeader', 'x', 0o644, body.length, entry.mtime, ''), padded(body), main]
}

export const textOf = (bytes: Uint8Array) => {
  const end = bytes.indexOf(0)
  return decoder.decode(end < 0 ? bytes : bytes.subarray(0, end))
}

const field = (header: Uint8Array, offset: number, length: number) => textOf(header.subarray(offset, offset + length))

const number = (header: Uint8Array, offset: number, length: number) => {
  if (!((header[offset] ?? 0) & 0x80)) return parseInt(field(header, offset, length).trim() || '0', 8)
  return header.subarray(offset + 1, offset + length).reduce((value, byte) => value * 256 + byte, 0)
}

export const readHeader = (header: Uint8Array): Header | undefined => {
  if (header.every(byte => byte === 0)) return undefined
  if (number(header, 148, 8) !== checksum(header)) throw new Error('The copied archive is damaged')
  const prefix = field(header, 257, 6) === 'ustar' ? field(header, 345, 155) : ''
  const name = field(header, 0, 100)
  return {
    name: prefix ? `${prefix}/${name}` : name,
    flag: String.fromCharCode(header[156] ?? 0),
    mode: number(header, 100, 8),
    size: number(header, 124, 12),
    mtime: number(header, 136, 12),
    link: field(header, 157, 100),
  }
}

export const readPax = (body: Uint8Array): Pax => {
  const fields: Pax = {}
  for (let at = 0; at < body.length; ) {
    const space = body.indexOf(32, at)
    if (space < 0) break
    const length = Number(decoder.decode(body.subarray(at, space)))
    if (!length) break
    const record = decoder.decode(body.subarray(space + 1, at + length - 1))
    const equals = record.indexOf('=')
    const key = record.slice(0, equals)
    if (key === 'path' || key === 'linkpath' || key === 'size') fields[key] = record.slice(equals + 1)
    at += length
  }
  return fields
}
