import { dlopen, FFIType, ptr } from 'bun:ffi'
import { ipv6Host, type Listener } from './host'

interface Family {
  id: number
  rowBytes: number
  portOffset: number
  pidOffset: number
  host(view: DataView, row: number): string
}

const NO_ERROR = 0
const ERROR_INSUFFICIENT_BUFFER = 122
const TCP_TABLE_OWNER_PID_LISTENER = 3
const START_BUFFER_BYTES = 1 << 14
const ROWS_OFFSET = 4

const load = () =>
  dlopen('iphlpapi.dll', {
    GetExtendedTcpTable: { args: [FFIType.ptr, FFIType.ptr, FFIType.bool, FFIType.u32, FFIType.u32, FFIType.u32], returns: FFIType.u32 },
  }).symbols

let iphlpapi: ReturnType<typeof load> | undefined

const ipv4At = (view: DataView, offset: number) => Array.from({ length: 4 }, (_, index) => view.getUint8(offset + index)).join('.')

const ipv6At = (view: DataView, offset: number) => ipv6Host(Array.from({ length: 8 }, (_, index) => view.getUint16(offset + index * 2)))

const IPV4: Family = { id: 2, rowBytes: 24, portOffset: 8, pidOffset: 20, host: (view, row) => ipv4At(view, row + 4) }
const IPV6: Family = { id: 23, rowBytes: 56, portOffset: 20, pidOffset: 52, host: ipv6At }

const tableOf = (family: Family) => {
  const api = (iphlpapi ??= load())
  const size = new Uint32Array([START_BUFFER_BYTES])
  for (;;) {
    const table = new Uint8Array(size[0]!)
    const status = api.GetExtendedTcpTable(ptr(table), ptr(size), false, family.id, TCP_TABLE_OWNER_PID_LISTENER, 0)
    if (status === NO_ERROR) return new DataView(table.buffer)
    if (status !== ERROR_INSUFFICIENT_BUFFER) throw new Error(`GetExtendedTcpTable failed with error ${status}`)
  }
}

const listenersOf = (family: Family): Listener[] => {
  const view = tableOf(family)
  return Array.from({ length: view.getUint32(0, true) }, (_, index) => {
    const row = ROWS_OFFSET + index * family.rowBytes
    return { pid: view.getUint32(row + family.pidOffset, true), port: view.getUint16(row + family.portOffset), host: family.host(view, row) }
  })
}

const windowsListeners = async (pids: ReadonlySet<number>) => [...listenersOf(IPV4), ...listenersOf(IPV6)].filter(listener => pids.has(listener.pid))

export { windowsListeners }
