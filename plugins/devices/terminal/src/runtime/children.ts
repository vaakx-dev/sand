import { dlopen, FFIType, ptr } from 'bun:ffi'

const SNAPSHOT_PROCESSES = 0x2
const ENTRY_SIZE = 568
const PROCESS_ID_OFFSET = 8
const PARENT_ID_OFFSET = 32
const INVALID_HANDLE = -1

const kernel = () =>
  dlopen('kernel32.dll', {
    CreateToolhelp32Snapshot: { args: [FFIType.u32, FFIType.u32], returns: FFIType.i64 },
    Process32FirstW: { args: [FFIType.i64, FFIType.ptr], returns: FFIType.i32 },
    Process32NextW: { args: [FFIType.i64, FFIType.ptr], returns: FFIType.i32 },
    CloseHandle: { args: [FFIType.i64], returns: FFIType.i32 },
  }).symbols

const windowsChildren = (pid: number) => {
  const { CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, CloseHandle } = kernel()
  const snapshot = CreateToolhelp32Snapshot(SNAPSHOT_PROCESSES, 0)
  if (Number(snapshot) === INVALID_HANDLE) return true
  const entry = new DataView(new ArrayBuffer(ENTRY_SIZE))
  entry.setUint32(0, ENTRY_SIZE, true)
  const at = ptr(entry)
  try {
    for (let more = Process32FirstW(snapshot, at); more; more = Process32NextW(snapshot, at)) {
      if (entry.getUint32(PARENT_ID_OFFSET, true) === pid && entry.getUint32(PROCESS_ID_OFFSET, true) !== pid) return true
    }
    return false
  } finally {
    CloseHandle(snapshot)
  }
}

const unixChildren = async (pid: number) => {
  const query = Bun.spawn(['pgrep', '-P', String(pid)], { stdout: 'ignore', stderr: 'ignore' })
  return (await query.exited) !== 1
}

export const hasChildren = async (pid: number) => (process.platform === 'win32' ? windowsChildren(pid) : unixChildren(pid))
