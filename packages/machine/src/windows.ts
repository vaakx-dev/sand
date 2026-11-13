import { dlopen, FFIType, ptr } from 'bun:ffi'
import type { ProcessInfo } from './process'

const SYSTEM_PROCESS_INFORMATION = 5
const STATUS_INFO_LENGTH_MISMATCH = 0xc0000004
const START_BUFFER_BYTES = 1 << 20
const SPARE_BUFFER_BYTES = 1 << 16
const PRIVATE_BYTES_OFFSET = 0xc8
const USER_TIME_OFFSET = 0x28
const KERNEL_TIME_OFFSET = 0x30
const IMAGE_NAME_LENGTH_OFFSET = 0x38
const IMAGE_NAME_BUFFER_OFFSET = 0x40
const TICKS_PER_MS = 10_000
const PROCESS_ID_OFFSET = 0x50
const PARENT_ID_OFFSET = 0x58

const load = () =>
  dlopen('ntdll.dll', {
    NtQuerySystemInformation: { args: [FFIType.i32, FFIType.ptr, FFIType.u32, FFIType.ptr], returns: FFIType.i32 },
  }).symbols

let ntdll: ReturnType<typeof load> | undefined

const processTable = () => {
  const api = (ntdll ??= load())
  const needed = new Uint32Array(1)
  for (let size = START_BUFFER_BYTES; ; size = needed[0]! + SPARE_BUFFER_BYTES) {
    const table = new Uint8Array(size)
    const status = api.NtQuerySystemInformation(SYSTEM_PROCESS_INFORMATION, ptr(table), size, ptr(needed)) >>> 0
    if (status === 0) return { view: new DataView(table.buffer), address: ptr(table) }
    if (status !== STATUS_INFO_LENGTH_MISMATCH) throw new Error(`NtQuerySystemInformation failed with status 0x${status.toString(16)}`)
  }
}

const UTF16 = new TextDecoder('utf-16le')

type Table = ReturnType<typeof processTable>

const nameAt = ({ view, address }: Table, offset: number) => {
  const length = view.getUint16(offset + IMAGE_NAME_LENGTH_OFFSET, true)
  const start = Number(view.getBigUint64(offset + IMAGE_NAME_BUFFER_OFFSET, true)) - address
  return length ? UTF16.decode(new Uint8Array(view.buffer, start, length)) : 'System Idle Process'
}

const cpuMsAt = ({ view }: Table, offset: number) =>
  Number(view.getBigUint64(offset + USER_TIME_OFFSET, true) + view.getBigUint64(offset + KERNEL_TIME_OFFSET, true)) / TICKS_PER_MS

const entryAt = (table: Table, offset: number): ProcessInfo => ({
  pid: Number(table.view.getBigUint64(offset + PROCESS_ID_OFFSET, true)),
  parent: Number(table.view.getBigUint64(offset + PARENT_ID_OFFSET, true)),
  name: nameAt(table, offset),
  bytes: Number(table.view.getBigUint64(offset + PRIVATE_BYTES_OFFSET, true)),
  cpuMs: cpuMsAt(table, offset),
})

const windowsProcesses = () => {
  const table = processTable()
  const found: ProcessInfo[] = []
  for (let offset = 0, next = -1; next !== 0; offset += next) {
    found.push(entryAt(table, offset))
    next = table.view.getUint32(offset, true)
  }
  return found
}

export { windowsProcesses }
