import { dlopen, FFIType, ptr } from 'bun:ffi'

const terminateAndAssign = 0x0101
const basicProcessIdList = 3
const extendedLimitInformation = 9
const processIdsOffset = 8
const pidBytes = 8
const killOnJobClose = 0x2000
const limitFlagsOffset = 16
const extendedLimitSize = 144

const load = () =>
  dlopen('kernel32.dll', {
    CreateJobObjectW: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
    SetInformationJobObject: { args: [FFIType.ptr, FFIType.i32, FFIType.ptr, FFIType.u32], returns: FFIType.bool },
    OpenProcess: { args: [FFIType.u32, FFIType.bool, FFIType.u32], returns: FFIType.ptr },
    AssignProcessToJobObject: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.bool },
    TerminateJobObject: { args: [FFIType.ptr, FFIType.u32], returns: FFIType.bool },
    QueryInformationJobObject: { args: [FFIType.ptr, FFIType.i32, FFIType.ptr, FFIType.u32, FFIType.ptr], returns: FFIType.bool },
    CloseHandle: { args: [FFIType.ptr], returns: FFIType.bool },
  }).symbols

type Kernel32 = ReturnType<typeof load>

type Job = NonNullable<ReturnType<Kernel32['CreateJobObjectW']>>

let kernel32: Kernel32 | undefined

const killOnCloseLimits = () => {
  const limits = new Uint8Array(extendedLimitSize)
  new DataView(limits.buffer).setUint32(limitFlagsOffset, killOnJobClose, true)
  return limits
}

const processIdsIn = (api: Kernel32, job: Job): number[] => {
  for (let room = 64; ; ) {
    const list = new Uint8Array(processIdsOffset + room * pidBytes)
    const listed = api.QueryInformationJobObject(job, basicProcessIdList, ptr(list), list.byteLength, null)
    const view = new DataView(list.buffer)
    const assigned = view.getUint32(0, true)
    if (listed) return Array.from({ length: view.getUint32(4, true) }, (_, index) => Number(view.getBigUint64(processIdsOffset + index * pidBytes, true)))
    if (assigned <= room) return []
    room = assigned
  }
}

export const jobObject = (pid: number, killOnClose: boolean) => {
  const api = (kernel32 ??= load())
  const job = api.CreateJobObjectW(null, null)
  if (!job) return undefined
  const process = api.OpenProcess(terminateAndAssign, false, pid)
  const held = process !== null && (!killOnClose || api.SetInformationJobObject(job, extendedLimitInformation, killOnCloseLimits(), extendedLimitSize)) && api.AssignProcessToJobObject(job, process)
  if (process) api.CloseHandle(process)
  if (!held) {
    api.CloseHandle(job)
    return undefined
  }
  let open = true
  return {
    kill: () => open && api.TerminateJobObject(job, 1),
    pids: () => (open ? processIdsIn(api, job) : []),
    close() {
      if (open) api.CloseHandle(job)
      open = false
    },
  }
}
