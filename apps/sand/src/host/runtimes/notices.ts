import type { RuntimeReason, WireEvent } from '@sand/protocol'

export const notice = (text: string): WireEvent => ({ name: 'ui.notify', args: [text, 'error'] })

export const failed = (error: string): WireEvent => ({ name: 'runtime.failed', args: [error] })

export const changed = (id: string, reason: RuntimeReason): WireEvent => ({ name: 'runtime.changed', args: [{ id, reason }] })
