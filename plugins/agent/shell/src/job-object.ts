import { dlopen, FFIType } from 'bun:ffi'

const terminateAndAssign = 0x0101
const extendedLimitInformation = 9
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
    CloseHandle: { args: [FFIType.ptr], returns: FFIType.bool },
  }).symbols

let kernel32: ReturnType<typeof load> | undefined

const killOnCloseLimits = () => {
  const limits = new Uint8Array(extendedLimitSize)
  new DataView(limits.buffer).setUint32(limitFlagsOffset, killOnJobClose, true)
  return limits
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
    close() {
      if (open) api.CloseHandle(job)
      open = false
    },
  }
}
