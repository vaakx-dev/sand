import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service, type Dispose } from 'drydock'
import { z } from 'zod'
import type { Key } from './keys'

export { parseKeys, type Key } from './keys'

export type ComputerKind = 'browser' | 'desktop'

export type Os = 'windows' | 'macos' | 'linux'

const platforms: Partial<Record<string, Os>> = { win32: 'windows', darwin: 'macos', linux: 'linux' }

export const osOf = (platform: string): Os => {
  const os = platforms[platform]
  if (!os) throw new Error(`sand cannot use computers on ${platform}`)
  return os
}

export interface ComputerInfo {
  id: string
  kind: ComputerKind
  label: string
  os: Os
}

export interface Size {
  width: number
  height: number
}

export interface Screenshot extends Size {
  png: Uint8Array
}

export const fitInside = (size: Size, fit: Size | undefined): Size => {
  const scale = fit ? Math.min(1, fit.width / size.width, fit.height / size.height) : 1
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) }
}

export interface Point {
  x: number
  y: number
}

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

export interface UiElement {
  ref: string
  role: string
  name: string
  box: Box
}

interface At<T extends string> {
  type: T
  at: Point
}

interface Held {
  keys?: Key[]
}

export type Action =
  | (At<'click'> & Held)
  | (At<'double_click'> & Held)
  | (At<'right_click'> & Held)
  | At<'move'>
  | ({ type: 'hold'; at: Point; ms: number } & Held)
  | ({ type: 'drag'; from: Point; to: Point; ms?: number } & Held)
  | { type: 'scroll'; at: Point; dx: number; dy: number }
  | { type: 'type'; text: string }
  | { type: 'key'; keys: Key[] }
  | { type: 'wait'; ms: number }
  | { type: 'open'; url: string }

export type ActionOf<T extends Action['type']> = Extract<Action, { type: T }>

export const heldKeys = (action: Action): Key[] => {
  if (action.type === 'key' || !('keys' in action)) return []
  return action.keys ?? []
}

export interface Computer {
  info: ComputerInfo
  screenshot(fit?: Size): Promise<Screenshot>
  elements(): Promise<UiElement[]>
  act(action: Action): Promise<void>
}

export interface Computers {
  register(computer: Computer): Dispose
  list(): ComputerInfo[]
  get(id: string): Computer | undefined
}

export const computers = service<Computers>('computers')

export const computersChange = event<() => void>('computers.change')

export const computersChangeWire = wireEvent<ComputerInfo[]>('computers.change')

export const computersList = request('computers.list', { input: z.object({}), output: type<ComputerInfo[]>() })

export const center = ({ left, top, right, bottom }: Box): Point => ({ x: (left + right) / 2, y: (top + bottom) / 2 })
