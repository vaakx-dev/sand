import type { Caller, WireEvent } from '@sand/host-hub/contract'
import { closedMessage, type Exit, limits, type Size, type TerminalInfo, terminalExit, terminalGrid, terminalOutput, terminalsChange } from '../contract'
import { sharedGrid, take, type Viewer } from './flow'
import { createHistory, type History } from './history'
import { isReply } from './replay'

export interface Pty {
  write(data: string): void
  resize(size: Size): void
  kill(): void
}

export interface PtyEvents {
  output(text: string): void
  exit(code: number): void
}

export interface Pc {
  platform: NodeJS.Platform
  isFolder(path: string): Promise<boolean>
  spawn(cwd: string, size: Size, events: PtyEvents): Pty
}

export interface Outbox {
  tell<P>(caller: Caller, event: WireEvent<P>, payload: P): void
  broadcast<P>(event: WireEvent<P>, payload: P): void
}

export type Later = (run: () => void, ms: number) => void

interface Terminal {
  id: string
  session: string
  cwd: string
  history: History
  viewers: Map<string, Viewer>
  grid: Size
  pty?: Pty
  exit?: Exit
  primary?: string
  flushing: boolean
  flushed: number
}

const flushDelay = { idle: 4, busy: 16 }
const busyFor = 50
const endedKeep = 10 * 60_000
const perSession = 8
const viewersKept = 16

const fullPath = (cwd: string, platform: NodeJS.Platform) => (platform === 'win32' ? /^[A-Za-z]:[\\/]/.test(cwd) : cwd.startsWith('/'))

const sameSize = (a: Size, b: Size) => a.cols === b.cols && a.rows === b.rows

export const createTerminals = (pc: Pc, outbox: Outbox, later: Later) => {
  const terminals = new Map<string, Terminal>()

  const need = (id: string) => {
    const terminal = terminals.get(id)
    if (!terminal) throw new Error(closedMessage)
    return terminal
  }

  const flush = (terminal: Terminal) => {
    terminal.flushing = false
    for (const viewer of terminal.viewers.values()) {
      if (!viewer.caller) continue
      for (let frame = take(terminal.id, terminal.history, viewer); frame; frame = take(terminal.id, terminal.history, viewer)) {
        outbox.tell(viewer.caller, terminalOutput, frame)
        terminal.flushed = performance.now()
      }
    }
  }

  const schedule = (terminal: Terminal) => {
    if (terminal.flushing) return
    terminal.flushing = true
    later(() => flush(terminal), performance.now() - terminal.flushed < busyFor ? flushDelay.busy : flushDelay.idle)
  }

  const fitGrid = (terminal: Terminal) => {
    const grid = sharedGrid(terminal.viewers.values())
    if (!grid || sameSize(grid, terminal.grid)) return
    terminal.grid = grid
    terminal.pty?.resize(grid)
    for (const { caller } of terminal.viewers.values()) if (caller) outbox.tell(caller, terminalGrid, { id: terminal.id, ...grid })
  }

  const viewerOf = (terminal: Terminal, id: string, caller: Caller) => {
    const viewer = terminal.viewers.get(id)
    if (!viewer || viewer.caller !== caller) throw new Error('Attach to the terminal first')
    return viewer
  }

  const keepViewers = (terminal: Terminal) => {
    for (const [id, viewer] of terminal.viewers) {
      if (terminal.viewers.size <= viewersKept) return
      if (!viewer.caller) terminal.viewers.delete(id)
    }
  }

  const attach = (terminal: Terminal, id: string, from: number | null, size: Size, caller: Caller) => {
    const viewer = terminal.viewers.get(id) ?? { id, sent: -1, acked: -1, input: 0 }
    terminal.viewers.delete(id)
    terminal.viewers.set(id, viewer)
    keepViewers(terminal)
    const resumes = from !== null && from >= terminal.history.start() && from <= terminal.history.end()
    viewer.caller = caller
    viewer.size = size
    viewer.sent = resumes ? from : -1
    viewer.acked = viewer.sent
    const primary = terminal.primary === undefined ? undefined : terminal.viewers.get(terminal.primary)
    if (!primary?.caller) terminal.primary = id
    fitGrid(terminal)
    schedule(terminal)
    return { grid: terminal.grid, ...(terminal.exit && { exit: terminal.exit }) }
  }

  const remove = (terminal: Terminal) => {
    if (terminals.get(terminal.id) !== terminal) return
    terminals.delete(terminal.id)
    terminal.pty?.kill()
    outbox.broadcast(terminalsChange, { session: terminal.session })
  }

  const start = (session: string, cwd: string, size: Size) => {
    const terminal: Terminal = { id: crypto.randomUUID(), session, cwd, history: createHistory(limits.history), viewers: new Map(), grid: size, flushing: false, flushed: 0 }
    terminal.pty = pc.spawn(cwd, size, {
      output(text) {
        terminal.history.append(text)
        schedule(terminal)
      },
      exit(code) {
        terminal.pty = undefined
        terminal.exit = { code, end: terminal.history.end() }
        flush(terminal)
        outbox.broadcast(terminalExit, { id: terminal.id, session, ...terminal.exit })
        later(() => remove(terminal), endedKeep)
      },
    })
    terminals.set(terminal.id, terminal)
    return terminal
  }

  const ofSession = (session: string) => [...terminals.values()].filter(terminal => terminal.session === session)

  return {
    list: ({ session }: { session: string }): TerminalInfo[] =>
      ofSession(session).map(({ id, cwd, exit }) => ({ id, cwd, ...(exit && { exit }) })),

    async open({ session, cwd, viewer, cols, rows }: { session: string; cwd: string; viewer: string } & Size, caller: Caller) {
      if (!fullPath(cwd, pc.platform)) throw new Error(`${cwd} isn't a full folder path`)
      if (!(await pc.isFolder(cwd))) throw new Error(`There's no folder at ${cwd} on this PC`)
      if (ofSession(session).filter(terminal => terminal.pty).length >= perSession) throw new Error(`A thread can run at most ${perSession} terminals`)
      const terminal = start(session, cwd, { cols, rows })
      attach(terminal, viewer, null, { cols, rows }, caller)
      outbox.broadcast(terminalsChange, { session })
      return { id: terminal.id }
    },

    attach: ({ id, viewer, from, cols, rows }: { id: string; viewer: string; from: number | null } & Size, caller: Caller) =>
      attach(need(id), viewer, from, { cols, rows }, caller),

    input({ id, viewer, seq, data }: { id: string; viewer: string; seq: number; data: string }, caller: Caller) {
      const terminal = need(id)
      const from = viewerOf(terminal, viewer, caller)
      if (!terminal.pty) throw new Error('The shell has ended')
      if (seq <= from.input) return
      from.input = seq
      if (isReply(data)) {
        if (terminal.primary !== viewer) return
      } else terminal.primary = viewer
      terminal.pty.write(data)
    },

    ack({ id, viewer, offset }: { id: string; viewer: string; offset: number }, caller: Caller) {
      const terminal = need(id)
      const from = viewerOf(terminal, viewer, caller)
      from.acked = Math.max(from.acked, Math.min(offset, from.sent))
      schedule(terminal)
    },

    resize({ id, viewer, cols, rows }: { id: string; viewer: string } & Size, caller: Caller) {
      const terminal = need(id)
      viewerOf(terminal, viewer, caller).size = { cols, rows }
      fitGrid(terminal)
    },

    detach({ id, viewer }: { id: string; viewer: string }, caller: Caller) {
      const terminal = terminals.get(id)
      const found = terminal?.viewers.get(viewer)
      if (!terminal || found?.caller !== caller) return
      found.caller = undefined
      fitGrid(terminal)
    },

    close: ({ id }: { id: string }) => remove(need(id)),

    left(caller: Caller) {
      for (const terminal of terminals.values()) {
        let changed = false
        for (const viewer of terminal.viewers.values()) {
          if (viewer.caller !== caller) continue
          viewer.caller = undefined
          changed = true
        }
        if (changed) fitGrid(terminal)
      }
    },

    closeAll() {
      for (const terminal of terminals.values()) terminal.pty?.kill()
      terminals.clear()
    },
  }
}

export type Terminals = ReturnType<typeof createTerminals>
