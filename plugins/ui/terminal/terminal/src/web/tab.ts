import { isPcUnavailable, type Wire } from '@sand/devices-contract'
import {
  applyFrame,
  closedMessage,
  type Exit,
  type Frame,
  type Size,
  terminalAck,
  terminalAttach,
  terminalBusy,
  terminalClose,
  terminalDetach,
  terminalInput,
  terminalOpen,
  terminalResize,
} from '@sand/devices-terminal/contract'
import type { Request } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { ITheme } from '@xterm/xterm'
import { createInput } from './input'
import type { CreateScreen } from './integrations/xterm'
import { arrowKey, type Modifier, modified } from './keys'
import { latest } from './latest'

export interface Place {
  session: string
  device: string
  cwd(): string
}

export interface TabOptions {
  place: Place
  wire: Wire
  createScreen: CreateScreen
  colors: ITheme
  closed(): void
  known?: { id: string; exit?: Exit }
}

type Link = 'idle' | 'joining' | 'joined'

type Stop = 'ended' | 'failed'

const sameSize = (a: Size, b: Size) => a.cols === b.cols && a.rows === b.rows

const focusReport = /^\x1b\[[IO]$/

export const createTab = ({ place, wire, createScreen, colors, closed, known }: TabOptions) => {
  let id = known?.id
  let exit = known?.exit
  let viewer = crypto.randomUUID()
  let offset = 0
  let fresh = true
  let link: Link = 'idle'
  let stop: Stop | undefined
  let mounted = false
  let visible = true
  let proposal: Size = { cols: 80, rows: 24 }
  const modifier = sig<Modifier | undefined>(undefined)
  const shown = () => mounted && visible

  const call = <I, O>(request: Request<I, O>, input: I) => wire.call(request, input, place.device)

  const withId = <T>(send: (id: string) => Promise<T>) => (id ? send(id) : Promise.reject(new Error(closedMessage)))

  const rejoin = () => {
    if (link !== 'joined') return
    link = 'idle'
    void join()
  }

  const input = createInput(batch => withId(id => call(terminalInput, { id, viewer, ...batch })), rejoin)
  const ack = latest<number>(at => withId(id => call(terminalAck, { id, viewer, offset: at })), (a, b) => a === b)
  const resize = latest<Size>(size => withId(id => call(terminalResize, { id, viewer, ...size })), sameSize)

  const settleExit = () => {
    if (!exit || stop || offset < exit.end) return
    stop = 'ended'
    screen.note(`The shell ended${exit.code ? ` with code ${exit.code}` : ''}. Press any key to start a new one.`)
  }

  const halt = (kind: Stop, text: string) => {
    link = 'idle'
    input.pause()
    stop = kind
    screen.note(text)
  }

  const leave = () => {
    const wasLinked = link !== 'idle'
    link = 'idle'
    input.pause()
    ack.forget()
    resize.forget()
    if (wasLinked && id) void call(terminalDetach, { id, viewer }).catch(() => {})
  }

  const joined = (grid: Size, ended: Exit | undefined) => {
    link = 'joined'
    if (!shown()) return leave()
    screen.grid(grid)
    resize.set(proposal)
    input.resume()
    if (ended) exit = ended
    settleExit()
  }

  const connect = async () => {
    if (!id) {
      const opened = await call(terminalOpen, { session: place.session, cwd: place.cwd(), viewer, ...proposal })
      id = opened.id
      return joined(proposal, undefined)
    }
    const attached = await call(terminalAttach, { id, viewer, from: fresh ? null : offset, ...proposal })
    joined(attached.grid, attached.exit)
  }

  async function join() {
    if (!shown() || link !== 'idle' || stop) return
    link = 'joining'
    try {
      await connect()
    } catch (error) {
      if (isPcUnavailable(error)) link = 'idle'
      else if (errorMessage(error) === closedMessage) halt('ended', 'This terminal has closed. Press any key to start a new one.')
      else halt('failed', `${errorMessage(error)}. Press any key to try again.`)
    }
  }

  const restart = () => {
    const old = id
    if (old) void call(terminalClose, { id: old }).catch(() => {})
    leave()
    id = undefined
    exit = undefined
    stop = undefined
    viewer = crypto.randomUUID()
    offset = 0
    fresh = true
    input.clear()
    screen.reset()
    void join()
  }

  const type = (data: string) => {
    if (stop && focusReport.test(data)) return
    if (stop === 'ended') return restart()
    if (stop === 'failed') {
      stop = undefined
      return void join()
    }
    const held = modifier.get()
    modifier.set(undefined)
    input.type(held ? modified(data, held) : data)
  }

  const screen = createScreen(colors, {
    input: type,
    propose(size) {
      proposal = size
      if (link === 'joined') resize.set(size)
    },
  })

  return {
    id: () => id,
    device: place.device,
    modifier,
    mount(node: HTMLElement) {
      const detach = screen.attach(node)
      mounted = true
      void join()
      return () => {
        mounted = false
        leave()
        detach()
      }
    },
    visible(yes: boolean) {
      visible = yes
      if (yes) void join()
      else leave()
    },
    frame(frame: Frame) {
      const applied = applyFrame(offset, frame)
      if (!applied) return rejoin()
      if (applied.reset) {
        screen.reset()
        if (stop === 'ended') stop = undefined
      }
      fresh = false
      offset = applied.offset
      const at = offset
      screen.write(applied.write, () => {
        if (link === 'joined') ack.set(at)
      })
      settleExit()
    },
    grid: screen.grid,
    exited(ended: Exit) {
      exit = ended
      settleExit()
    },
    reconnect() {
      if (link === 'joining') return
      link = 'idle'
      input.pause()
      ack.forget()
      resize.forget()
      void join()
    },
    send: type,
    arrow: (key: 'A' | 'B' | 'C' | 'D') => type(arrowKey(key, screen.applicationCursor())),
    paste: screen.paste,
    focus: screen.focus,
    busy: () => (exit ? Promise.resolve(false) : withId(found => call(terminalBusy, { id: found })).catch(() => true)),
    end() {
      if (id) void call(terminalClose, { id }).catch(() => {})
      leave()
      closed()
    },
    paint: screen.paint,
    dispose() {
      leave()
      screen.dispose()
    },
  }
}

export type Tab = ReturnType<typeof createTab>
