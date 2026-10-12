import { dlopen, FFIType } from 'bun:ffi'

const terminateAndAssign = 0x0101

const load = () =>
  dlopen('kernel32.dll', {
    CreateJobObjectW: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
    OpenProcess: { args: [FFIType.u32, FFIType.bool, FFIType.u32], returns: FFIType.ptr },
    AssignProcessToJobObject: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.bool },
    TerminateJobObject: { args: [FFIType.ptr, FFIType.u32], returns: FFIType.bool },
    CloseHandle: { args: [FFIType.ptr], returns: FFIType.bool },
  }).symbols

let kernel32: ReturnType<typeof load> | undefined

export const jobObject = (pid: number) => {
  const api = (kernel32 ??= load())
  const job = api.CreateJobObjectW(null, null)
  if (!job) return undefined
  const process = api.OpenProcess(terminateAndAssign, false, pid)
  const held = process !== null && api.AssignProcessToJobObject(job, process)
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
