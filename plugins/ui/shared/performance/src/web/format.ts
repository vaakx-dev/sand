const MB = 1024 * 1024
const GB = 1024 * MB

const platformNames: Record<string, string> = { win32: 'Windows', darwin: 'Mac', linux: 'Linux' }

export const amount = (bytes: number) => (bytes >= GB ? `${(bytes / GB).toFixed(bytes >= 100 * GB ? 0 : 1)} GB` : `${Math.round(bytes / MB)} MB`)

export const share = (fraction: number) => `${(fraction * 100).toFixed(1)}%`

export const wholeShare = (fraction: number) => `${Math.round(fraction * 100)}%`

export const platformName = (platform: string | undefined) => (platform && platformNames[platform]) ?? platform ?? ''

export const clockTime = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
