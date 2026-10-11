import type { Dispose } from 'drydock'

export type Driver = 'agent' | 'user'

export type HistoryAction = 'back' | 'forward' | 'reload'

export interface Viewport {
  width: number
  height: number
  scale: number
}

export interface Point {
  x: number
  y: number
}

export interface AgentAction {
  verb: string
  target: string
  point?: Point
  at: number
}

export interface TabState {
  thread: string
  url: string
  title: string
  loading: boolean
  canBack: boolean
  canForward: boolean
  driver: Driver
  acting: boolean
  action?: AgentAction
  viewport: Viewport
  errors: number
}

export type LogLevel = 'log' | 'info' | 'warning' | 'error'

export interface ConsoleEntry {
  level: LogLevel
  text: string
  source?: string
  at: number
}

export interface NetworkEntry {
  method: string
  url: string
  type: string
  status?: number
  failed?: string
  at: number
}

export interface Logs {
  console: ConsoleEntry[]
  network: NetworkEntry[]
}

export type MouseButton = 'none' | 'left' | 'middle' | 'right'

export type UserInput =
  | { kind: 'mouse'; type: 'mousePressed' | 'mouseReleased' | 'mouseMoved'; x: number; y: number; button: MouseButton; clickCount: number; modifiers: number }
  | { kind: 'wheel'; x: number; y: number; deltaX: number; deltaY: number; modifiers: number }
  | { kind: 'key'; type: 'keyDown' | 'keyUp'; key: string; code: string; keyCode: number; text?: string; modifiers: number }
  | { kind: 'text'; text: string }

export interface Picked {
  url: string
  selector: string
  role: string
  name: string
  component?: string
  text: string
  html: string
  image?: string
}

export type Target = { ref: string } | Point

export type ScrollDirection = 'up' | 'down' | 'left' | 'right'

export interface TypeOptions {
  clear: boolean
  submit: boolean
}

export interface WaitFor {
  text?: string
  gone?: string
  ms: number
}

export interface Opened {
  url: string
  title: string
  status?: number
}

export interface AgentControls {
  open(url: string): Promise<Opened>
  history(action: HistoryAction): Promise<Opened>
  snapshot(): Promise<string>
  screenshot(ref?: string): Promise<string>
  click(target: Target, count: number): Promise<string>
  type(ref: string, text: string, options: TypeOptions): Promise<string>
  press(keys: string): Promise<void>
  scroll(direction: ScrollDirection, pages: number, ref?: string): Promise<void>
  wait(condition: WaitFor): Promise<boolean>
  evaluate(script: string): Promise<string>
  errorsSince(at: number): ConsoleEntry[]
}

export interface BrowserTab {
  thread: string
  state(): TabState
  logs(): Logs
  frames(listener: (frame: Uint8Array) => void): Dispose
  closed: Promise<void>
  resize(viewport: Viewport): Promise<void>
  input(event: UserInput): Promise<void>
  control(driver: Driver): void
  open(url: string): Promise<void>
  history(action: HistoryAction): Promise<void>
  inspect(point?: Point): Promise<void>
  pick(point: Point): Promise<Picked>
  agent: AgentControls
}

export interface Browser {
  tab(thread: string): Promise<BrowserTab>
  find(thread: string): BrowserTab | undefined
  close(thread: string): Promise<void>
}

declare module 'drydock' {
  interface Services {
    browser: Browser
  }

  interface Events {
    'browser.change': (state: TabState) => void
    'browser.close': (thread: string) => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'browser.state': { thread: string }
    'browser.open': { thread: string; url: string }
    'browser.history': { thread: string; action: HistoryAction }
    'browser.input': { thread: string; input: UserInput }
    'browser.control': { thread: string; driver: Driver }
    'browser.resize': { thread: string; viewport: Viewport }
    'browser.inspect': { thread: string; point?: Point }
    'browser.pick': { thread: string; point: Point }
    'browser.logs': { thread: string }
    'browser.close': { thread: string }
  }

  interface WireEvents {
    'browser.change': [state: TabState]
    'browser.close': [thread: string]
  }
}
