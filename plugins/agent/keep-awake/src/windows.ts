import { dlopen, FFIType } from 'bun:ffi'
import type { SleepBlock } from './block'

const ES_CONTINUOUS = 0x80000000
const ES_SYSTEM_REQUIRED = 0x00000001

const executionState = (): SleepBlock => {
  const { symbols } = dlopen('kernel32.dll', { SetThreadExecutionState: { args: [FFIType.u32], returns: FFIType.u32 } })
  return {
    hold: () => void symbols.SetThreadExecutionState(ES_CONTINUOUS + ES_SYSTEM_REQUIRED),
    release: () => void symbols.SetThreadExecutionState(ES_CONTINUOUS),
  }
}

export { executionState }
