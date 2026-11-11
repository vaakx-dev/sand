import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export const limits = {
  history: 1_048_576,
  snapshot: 131_072,
  window: 131_072,
  frame: 16_384,
  input: 65_536,
}

export const closedMessage = 'That terminal has closed'

export interface Size {
  cols: number
  rows: number
}

export interface Frame {
  id: string
  data: string
  end: number
  reset?: true
}

export interface Exit {
  code: number
  end: number
}

export interface TerminalInfo {
  id: string
  cwd: string
  exit?: Exit
}

export interface Applied {
  offset: number
  write: string
  reset: boolean
}

export const applyFrame = (offset: number, frame: Frame): Applied | undefined => {
  if (frame.reset) return { offset: frame.end, write: frame.data, reset: true }
  const start = frame.end - frame.data.length
  if (start > offset) return undefined
  return { offset: Math.max(offset, frame.end), write: frame.data.slice(Math.min(frame.data.length, offset - start)), reset: false }
}

const id = z.string().min(1)
const viewer = z.string().min(1).max(64)
const size = { cols: z.number().int().min(1).max(1000), rows: z.number().int().min(1).max(500) }

export const terminalList = request('terminal.list', { input: z.object({ session: z.string().min(1) }), output: type<TerminalInfo[]>(), place: 'thread' })

export const terminalOpen = request('terminal.open', {
  input: z.object({ session: z.string().min(1), cwd: z.string().min(1), viewer, ...size }),
  output: type<{ id: string }>(),
  place: 'thread',
})

export const terminalAttach = request('terminal.attach', {
  input: z.object({ id, viewer, from: z.number().int().min(0).nullable(), ...size }),
  output: type<{ grid: Size; exit?: Exit }>(),
  place: 'thread',
})

export const terminalInput = request('terminal.input', {
  input: z.object({ id, viewer, seq: z.number().int().min(1), data: z.string().min(1).max(limits.input) }),
  output: type<void>(),
  place: 'thread',
})

export const terminalAck = request('terminal.ack', { input: z.object({ id, viewer, offset: z.number().int().min(0) }), output: type<void>(), place: 'thread' })
export const terminalResize = request('terminal.resize', { input: z.object({ id, viewer, ...size }), output: type<void>(), place: 'thread' })
export const terminalDetach = request('terminal.detach', { input: z.object({ id, viewer }), output: type<void>(), place: 'thread' })
export const terminalClose = request('terminal.close', { input: z.object({ id }), output: type<void>(), place: 'thread' })

export const terminalOutput = wireEvent<Frame>('terminal.output')
export const terminalGrid = wireEvent<{ id: string } & Size>('terminal.grid')
export const terminalExit = wireEvent<{ id: string; session: string } & Exit>('terminal.exit')
export const terminalsChange = wireEvent<{ session: string }>('terminal.list')
