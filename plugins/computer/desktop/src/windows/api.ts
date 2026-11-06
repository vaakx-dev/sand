import { dlopen, FFIType } from 'bun:ffi'

const { ptr, i32, u32, i64, bool } = FFIType

const loadUser32 = () =>
  dlopen('user32.dll', {
    SendInput: { args: [u32, ptr, i32], returns: u32 },
    GetCursorPos: { args: [ptr], returns: bool },
    GetSystemMetrics: { args: [i32], returns: i32 },
    MapVirtualKeyW: { args: [u32, u32], returns: u32 },
    SetThreadDpiAwarenessContext: { args: [i64], returns: i64 },
    GetDC: { args: [ptr], returns: ptr },
    ReleaseDC: { args: [ptr, ptr], returns: i32 },
    GetForegroundWindow: { args: [], returns: ptr },
    WindowFromPoint: { args: [i64], returns: ptr },
    GetAncestor: { args: [ptr, u32], returns: ptr },
    GetClassNameW: { args: [ptr, ptr, i32], returns: i32 },
    GetWindowTextW: { args: [ptr, ptr, i32], returns: i32 },
    GetWindowThreadProcessId: { args: [ptr, ptr], returns: u32 },
  }).symbols

const loadGdi32 = () =>
  dlopen('gdi32.dll', {
    CreateCompatibleDC: { args: [ptr], returns: ptr },
    CreateCompatibleBitmap: { args: [ptr, i32, i32], returns: ptr },
    SelectObject: { args: [ptr, ptr], returns: ptr },
    StretchBlt: { args: [ptr, i32, i32, i32, i32, ptr, i32, i32, i32, i32, u32], returns: bool },
    SetStretchBltMode: { args: [ptr, i32], returns: i32 },
    SetBrushOrgEx: { args: [ptr, i32, i32, ptr], returns: bool },
    GetDIBits: { args: [ptr, ptr, u32, u32, ptr, ptr, u32], returns: i32 },
    DeleteObject: { args: [ptr], returns: bool },
    DeleteDC: { args: [ptr], returns: bool },
  }).symbols

const loadKernel32 = () =>
  dlopen('kernel32.dll', {
    OpenProcess: { args: [u32, bool, u32], returns: ptr },
    QueryFullProcessImageNameW: { args: [ptr, u32, ptr, ptr], returns: bool },
    CloseHandle: { args: [ptr], returns: bool },
  }).symbols

const loadAdvapi32 = () =>
  dlopen('advapi32.dll', {
    OpenProcessToken: { args: [ptr, u32, ptr], returns: bool },
    GetTokenInformation: { args: [ptr, u32, ptr, u32, ptr], returns: bool },
  }).symbols

let user32: ReturnType<typeof loadUser32> | undefined
let gdi32: ReturnType<typeof loadGdi32> | undefined
let kernel32: ReturnType<typeof loadKernel32> | undefined
let advapi32: ReturnType<typeof loadAdvapi32> | undefined

export const win32 = () => ({
  user32: (user32 ??= loadUser32()),
  gdi32: (gdi32 ??= loadGdi32()),
  kernel32: (kernel32 ??= loadKernel32()),
  advapi32: (advapi32 ??= loadAdvapi32()),
})

export type Win32 = ReturnType<typeof win32>

export type Handle = NonNullable<ReturnType<Win32['user32']['GetForegroundWindow']>>
