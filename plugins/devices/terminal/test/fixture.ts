import { type Caller, type CallerKind, createHandlers } from '@sand/host-hub/contract'
import { applyFrame, type Frame, type Size, terminalOutput } from '../src/contract'
import { serveTerminals } from '../src/runtime/requests'
import { createTerminals, type Pc, type PtyEvents } from '../src/runtime/terminals'

export interface Shell {
  cwd: string
  size: Size
  typed: string[]
  killed: boolean
  running: boolean
  events: PtyEvents
}

export interface Told {
  caller?: Caller
  event: string
  payload: unknown
}

export const page = (kind: CallerKind = 'browser'): Caller => ({ device: 'page', kind })

export const setup = (folders = ['/work']) => {
  const shells: Shell[] = []
  const told: Told[] = []
  const timers: (() => void)[] = []
  const pc: Pc = {
    platform: 'linux',
    isFolder: async path => folders.includes(path),
    spawn(cwd, size, events) {
      const shell: Shell = { cwd, size, typed: [], killed: false, running: false, events }
      shells.push(shell)
      return {
        write: data => void shell.typed.push(data),
        resize(next) {
          shell.size = next
        },
        busy: async () => shell.running,
        kill() {
          shell.killed = true
        },
      }
    },
  }
  const terminals = createTerminals(
    pc,
    {
      tell: (caller, event, payload) => void told.push({ caller, event: event.id, payload }),
      broadcast: (event, payload) => void told.push({ event: event.id, payload }),
    },
    run => void timers.push(run),
  )
  const handlers = createHandlers()
  serveTerminals(handlers, terminals)
  const tick = () => {
    for (const run of timers.splice(0)) run()
  }
  const framesFor = (caller: Caller) => {
    const frames = told.filter(entry => entry.caller === caller && entry.event === terminalOutput.id).map(entry => entry.payload as Frame)
    told.splice(0, told.length, ...told.filter(entry => !(entry.caller === caller && entry.event === terminalOutput.id)))
    return frames
  }
  return { shells, told, terminals, handlers, tick, framesFor }
}

export const createScreen = () => {
  let offset = 0
  let text = ''
  return {
    offset: () => offset,
    text: () => text,
    apply(frames: Frame[]) {
      for (const frame of frames) {
        const applied = applyFrame(offset, frame)
        if (!applied) throw new Error(`gap at ${offset}`)
        text = applied.reset ? applied.write : text + applied.write
        offset = applied.offset
      }
    },
  }
}
