import { dlopen, FFIType, ptr } from 'bun:ffi'
import type { ProcessInfo } from './process'

const SYSTEM_PROCESS_INFORMATION = 5
const STATUS_INFO_LENGTH_MISMATCH = 0xc0000004
const START_BUFFER_BYTES = 1 << 20
const SPARE_BUFFER_BYTES = 1 << 16
const PRIVATE_BYTES_OFFSET = 0xc8
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
    if (status === 0) return new DataView(table.buffer)
    if (status !== STATUS_INFO_LENGTH_MISMATCH) throw new Error(`NtQuerySystemInformation failed with status 0x${status.toString(16)}`)
  }
}

const entryAt = (table: DataView, offset: number): ProcessInfo => ({
  pid: Number(table.getBigUint64(offset + PROCESS_ID_OFFSET, true)),
  parent: Number(table.getBigUint64(offset + PARENT_ID_OFFSET, true)),
  bytes: Number(table.getBigUint64(offset + PRIVATE_BYTES_OFFSET, true)),
})

const windowsProcesses = () => {
  const table = processTable()
  const found: ProcessInfo[] = []
  for (let offset = 0, next = -1; next !== 0; offset += next) {
    found.push(entryAt(table, offset))
    next = table.getUint32(offset, true)
  }
  return found
}

export { windowsProcesses }
