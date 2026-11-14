import { cleanPath, type Entry, type Listing } from './entry'
import { MAX_ENTRIES, damaged, tooManyEntries } from './limits'

interface Header {
  type: string
  path: string
  size: number
  modified: number
}

interface Overrides {
  path?: string
  size?: number
}

const BLOCK = 512
const MAX_METADATA_BYTES = 64 * 1024
const CHECKSUM = { at: 148, length: 8 }
const SPACE = 0x20
const USTAR = 'ustar\0'
const FILE_TYPES = new Set(['0', '\0', '7'])
const FOLDER_TYPE = '5'
const LONG_NAME_TYPE = 'L'
const LOCAL_PAX_TYPE = 'x'
const GLOBAL_PAX_TYPE = 'g'

const decoder = new TextDecoder()

const text = (block: Uint8Array, at: number, length: number) => decoder.decode(block.subarray(at, at + length)).replace(/\0.*$/s, '')

const octal = (block: Uint8Array, at: number, length: number) => {
  if (block[at]! & 0x80) throw damaged('an entry is larger than 8 GB')
  const digits = text(block, at, length).trim()
  if (!/^[0-7]*$/.test(digits)) throw damaged('a tar header holds an unreadable number')
  return Number.parseInt(digits || '0', 8)
}

const checksumOf = (block: Uint8Array) =>
  block.reduce((sum, byte, index) => sum + (index >= CHECKSUM.at && index < CHECKSUM.at + CHECKSUM.length ? SPACE : byte), 0)

const validHeader = (block: Uint8Array) => {
  const stored = text(block, CHECKSUM.at, CHECKSUM.length).trim()
  return /^[0-7]+$/.test(stored) && Number.parseInt(stored, 8) === checksumOf(block)
}

const isTar = (data: Uint8Array) => data.length >= BLOCK && validHeader(data.subarray(0, BLOCK))

const ended = (block: Uint8Array) => block.every(byte => byte === 0)

const headerOf = (block: Uint8Array): Header => {
  const prefix = text(block, 257, 6) === USTAR.slice(0, 5) && block[262] === 0 ? text(block, 345, 155) : ''
  const name = text(block, 0, 100)
  return {
    type: String.fromCharCode(block[156]!),
    path: prefix ? `${prefix}/${name}` : name,
    size: octal(block, 124, 12),
    modified: octal(block, 136, 12) * 1000,
  }
}

const paxRecords = (content: Uint8Array): Overrides => {
  const found: Record<string, string> = {}
  for (let at = 0; at < content.length; ) {
    const space = content.indexOf(SPACE, at)
    const length = Number(decoder.decode(content.subarray(at, space)))
    const end = at + length
    if (space < 0 || !Number.isSafeInteger(length) || end <= space || end > content.length) throw damaged('a tar header has unreadable extended attributes')
    const record = decoder.decode(content.subarray(space + 1, end - 1))
    const equals = record.indexOf('=')
    found[record.slice(0, equals)] = record.slice(equals + 1)
    at = end
  }
  const size = found.size === undefined ? undefined : Number(found.size)
  if (size !== undefined && !Number.isSafeInteger(size)) throw damaged('a tar entry has an unreadable size')
  return { ...(found.path !== undefined && { path: found.path }), ...(size !== undefined && { size }) }
}

const metadata = (content: Uint8Array) => {
  if (content.length > MAX_METADATA_BYTES) throw damaged('a tar header is too long')
  return content
}

const tarArchive = (data: Uint8Array<ArrayBuffer>): Listing => {
  const entries: Entry[] = []
  const folders: string[] = []
  let global: Overrides = {}
  let local: Overrides = {}
  for (let at = 0; at + BLOCK <= data.length; ) {
    const block = data.subarray(at, at + BLOCK)
    if (ended(block)) break
    if (!validHeader(block)) throw damaged('a tar header failed its checksum')
    const header = headerOf(block)
    const special = [LONG_NAME_TYPE, LOCAL_PAX_TYPE, GLOBAL_PAX_TYPE].includes(header.type)
    const { path, size } = special ? header : { ...header, ...global, ...local }
    const start = at + BLOCK
    const end = start + size
    if (end > data.length) throw damaged('it ends partway through an entry')
    const content = data.subarray(start, end)
    at = start + Math.ceil(size / BLOCK) * BLOCK
    if (header.type === LONG_NAME_TYPE) local = { ...local, path: text(metadata(content), 0, content.length) }
    if (header.type === LOCAL_PAX_TYPE) local = { ...local, ...paxRecords(metadata(content)) }
    if (header.type === GLOBAL_PAX_TYPE) global = { ...global, ...paxRecords(metadata(content)) }
    if (special) continue
    local = {}
    const clean = cleanPath(path)
    if (!clean) continue
    if (header.type === FOLDER_TYPE) folders.push(clean)
    if (FILE_TYPES.has(header.type)) entries.push({ path: clean, size, modified: header.modified, unpack: async () => content })
    if (entries.length + folders.length > MAX_ENTRIES) throw tooManyEntries()
  }
  return { kind: 'listing', entries, folders }
}

export { isTar, tarArchive }
