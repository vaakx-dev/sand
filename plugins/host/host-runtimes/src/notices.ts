import type { RuntimeReason, WireEvent } from '@sand/protocol'

export const notice = (text: string): WireEvent => ({ name: 'ui.notify', args: [text, 'error'] })

const joined = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)

export const restoredText = (names: string[]) =>
  `Your change to ${joined(names)} stopped sand from starting, so the previous version is back. Settings › Plugins › ${joined(names)} › History has both.`

export const failed = (error: string): WireEvent => ({ name: 'runtime.failed', args: [error] })

export const changed = (id: string, reason: RuntimeReason): WireEvent => ({ name: 'runtime.changed', args: [{ id, reason }] })
