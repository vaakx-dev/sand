import type { Point } from '@sand/computers/contract'
import type { Handle, Win32 } from './api'
import { dpiAware } from './screen'

export interface WindowFacts {
  handle: number
  className: string
  title: string
  process: string
  elevated: boolean | undefined
}

const rootWindow = 2
const queryLimitedInformation = 0x1000
const tokenQuery = 0x8
const tokenElevation = 20
const textLength = 512

const secureClasses = new Set(['Credential Dialog Xaml Host', 'Shell_SystemDialog', 'Shell_SystemDim', '$$$Secure UAP Dummy Window Class For Interim Dialog'])
const secureProcesses = new Set(['consent.exe', 'credentialuibroker.exe', 'logonui.exe', 'lockapp.exe', 'securehealthui.exe'])

const named = ({ title, process }: WindowFacts) => (title ? `"${title}" (${process})` : process)

export const refusal = (window: WindowFacts | undefined): string | undefined => {
  if (!window) return 'No window can take input: the screen may be locked, or a secure prompt such as an administrator request is showing. Ask the user to deal with it.'
  if (secureClasses.has(window.className) || secureProcesses.has(window.process.toLowerCase()))
    return `A Windows security or sign-in prompt, ${named(window)}, is in the way. sand never clicks or types into these; ask the user to answer it.`
  if (window.elevated !== false) return `${named(window)} runs as administrator, or sand cannot tell. sand never clicks or types into such windows; ask the user to do this step.`
  return undefined
}

const text = (read: (buffer: Uint16Array, length: number) => number) => {
  const buffer = new Uint16Array(textLength)
  return String.fromCharCode(...buffer.subarray(0, read(buffer, textLength)))
}

const imageName = ({ kernel32 }: Win32, process: Handle) => {
  const buffer = new Uint16Array(textLength)
  const size = new Uint32Array([textLength])
  if (!kernel32.QueryFullProcessImageNameW(process, 0, buffer, size)) return ''
  return String.fromCharCode(...buffer.subarray(0, size[0])).split('\\').at(-1) ?? ''
}

const isElevated = ({ kernel32, advapi32 }: Win32, process: Handle) => {
  const token = new BigUint64Array(1)
  if (!advapi32.OpenProcessToken(process, tokenQuery, token)) return undefined
  const handle = token[0] ?? 0n
  const elevation = new Uint32Array(1)
  const read = advapi32.GetTokenInformation(handle, tokenElevation, elevation, elevation.byteLength, new Uint32Array(1))
  kernel32.CloseHandle(handle)
  return read ? elevation[0] !== 0 : undefined
}

const factsOf = (api: Win32, window: Handle | null): WindowFacts | undefined => {
  if (!window) return undefined
  const { user32, kernel32 } = api
  const pid = new Uint32Array(1)
  user32.GetWindowThreadProcessId(window, pid)
  const process = kernel32.OpenProcess(queryLimitedInformation, false, pid[0] ?? 0)
  const facts = {
    handle: Number(window),
    className: text((buffer, length) => user32.GetClassNameW(window, buffer, length)),
    title: text((buffer, length) => user32.GetWindowTextW(window, buffer, length)),
    process: process ? imageName(api, process) : '',
    elevated: process ? isElevated(api, process) : undefined,
  }
  if (process) kernel32.CloseHandle(process)
  return facts
}

export const foreground = (api: Win32) => factsOf(api, api.user32.GetForegroundWindow())

export const windowAt = (api: Win32, { x, y }: Point) =>
  dpiAware(api, () => {
    const packed = BigInt.asIntN(64, (BigInt(y) << 32n) | (BigInt(x) & 0xffffffffn))
    return factsOf(api, api.user32.GetAncestor(api.user32.WindowFromPoint(packed), rootWindow))
  })
