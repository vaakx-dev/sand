import { crc32 } from './crc'
import { SIGNATURE } from './directory'
import { joined } from './joined'

interface Part {
  name: Uint8Array
  data: Uint8Array
  crc: number
  offset: number
}

const LOCAL_BYTES = 30
const CENTRAL_BYTES = 46
const END_BYTES = 22
const VERSION = 20
const UTF8_NAMES = 0x0800
const FIRST_DAY = 0x21

const encoder = new TextEncoder()

const localHeader = (part: Part) => {
  const header = new Uint8Array(LOCAL_BYTES + part.name.length)
  const view = new DataView(header.buffer)
  view.setUint32(0, SIGNATURE.local, true)
  view.setUint16(4, VERSION, true)
  view.setUint16(6, UTF8_NAMES, true)
  view.setUint16(12, FIRST_DAY, true)
  view.setUint32(14, part.crc, true)
  view.setUint32(18, part.data.length, true)
  view.setUint32(22, part.data.length, true)
  view.setUint16(26, part.name.length, true)
  header.set(part.name, LOCAL_BYTES)
  return header
}

const centralHeader = (part: Part) => {
  const header = new Uint8Array(CENTRAL_BYTES + part.name.length)
  const view = new DataView(header.buffer)
  view.setUint32(0, SIGNATURE.central, true)
  view.setUint16(4, VERSION, true)
  view.setUint16(6, VERSION, true)
  view.setUint16(8, UTF8_NAMES, true)
  view.setUint16(14, FIRST_DAY, true)
  view.setUint32(16, part.crc, true)
  view.setUint32(20, part.data.length, true)
  view.setUint32(24, part.data.length, true)
  view.setUint16(28, part.name.length, true)
  view.setUint32(42, part.offset, true)
  header.set(part.name, CENTRAL_BYTES)
  return header
}

const endRecord = (count: number, directoryBytes: number, directoryAt: number) => {
  const record = new Uint8Array(END_BYTES)
  const view = new DataView(record.buffer)
  view.setUint32(0, SIGNATURE.end, true)
  view.setUint16(8, count, true)
  view.setUint16(10, count, true)
  view.setUint32(12, directoryBytes, true)
  view.setUint32(16, directoryAt, true)
  return record
}

const laidOut = (files: [string, Uint8Array][]) => {
  let offset = 0
  return files.map(([name, data]): Part => {
    const part = { name: encoder.encode(name), data, crc: crc32(data), offset }
    offset += LOCAL_BYTES + part.name.length + data.length
    return part
  })
}

const storedZip = (files: [string, Uint8Array][]) => {
  const parts = laidOut(files)
  const locals = parts.flatMap(part => [localHeader(part), part.data])
  const centrals = parts.map(centralHeader)
  const directoryAt = locals.reduce((size, chunk) => size + chunk.length, 0)
  const directoryBytes = centrals.reduce((size, chunk) => size + chunk.length, 0)
  return joined([...locals, ...centrals, endRecord(parts.length, directoryBytes, directoryAt)])
}

export { storedZip }
