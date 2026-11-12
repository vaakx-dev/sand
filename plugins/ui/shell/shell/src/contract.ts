import type { Owner } from '@sand/engine/contract'
import { running } from '@sand/reactive'
import { byId, collectScope, disposeAll, div, mount, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { event, service, type Context, type Dispose } from 'drydock'

export type ShellState = 'phone' | 'drawer' | 'wide'

export interface Route {
  kind: string
  id?: string
  tab?: string
}

export const statuses = ['waiting', 'ready', 'merging', 'running', 'merged', 'done'] as const

export type Status = (typeof statuses)[number]

export interface MenuAction {
  id: string
  label: string
  icon?: string
  order?: number
  group?: string
  quick?: boolean
  tile?: boolean
  active?: boolean
  danger?: boolean
  dot?: () => boolean
  count?: () => number
  confirm?: string
  choices?: MenuChoice[]
  ask?: MenuAsk
  run(): void | Promise<unknown>
}

export interface MenuChoice {
  id: string
  label: string
  tip?(): string
  run(): void | Promise<unknown>
}

export interface MenuAsk {
  placeholder: string
  tip: string
  submit: string
  preview(text: string): string | undefined
  run(text: string): void | Promise<unknown>
}

interface NavBase {
  id: string
  label: string
  icon: string
  order?: number
  place?: 'top' | 'nav' | 'foot' | 'foot-end'
  look?: 'row' | 'field' | 'alert'
  summary?(): string
  detail?(): string
  keys?: string
  count?(): number
  dot?(): boolean
  current?(): boolean
}

export type NavItem = NavBase & ({ to: Route; run?: never } | { run(): void; to?: never })

export interface GroupAction {
  label: string
  icon: string
  run(): void
}

export interface RowPlace {
  label: string
  mark?(): Child
}

export interface Row {
  id: string
  label: string
  end?: string
  at?: number
  lead?(): Child
  detail?(): Child
  status?: Status
  place?: RowPlace
  trail?(): Child
}

export interface ShellRow extends Row {
  to: Route
  menu?(): MenuAction[]
}

export interface ShellGroup {
  id: string
  label: string
  action?: GroupAction
  folded?: boolean
  rows: ShellRow[]
  empty?: string
}

export interface ShellSection {
  id: string
  order?: number
  groups(): ShellGroup[]
}

export type AsideKind = 'card' | 'panel' | 'drawer'

export interface Aside {
  id: string
  kind: AsideKind
  label: string
  icon: string
  order?: number
  shows(route: Route): boolean
  head?(route: () => Route): Child
  render(route: () => Route): HTMLElement
}

export interface Subject {
  session: string
  owner: Owner
  device: string
  cwd?: string
  draft?: boolean
}

export type SubjectSource = (route: Route) => Subject | undefined

export interface ScreenNav {
  label: string
  render(): HTMLElement
}

export type BackTo = () => (() => void) | undefined

export interface Screen {
  head(): Child
  back?: BackTo
  main(): HTMLElement
  nav?: ScreenNav
  split?: boolean
}

export interface RouteSpec {
  kind: string
  order?: number
  lands?: boolean
  render(route: () => Route): Screen
}

export type SheetSize = 'sm' | 'md' | 'lg'

export type SheetLook = 'form' | 'bare' | 'list' | 'search' | 'viewer'

export interface SheetSpec {
  label: MaybeReactive<string>
  title?: MaybeReactive<string>
  back?: BackTo
  look?: SheetLook
  size?: SheetSize
  closeButton?: false
  alert?: boolean
  head?(close: () => void): Child
  body(close: () => void): Child
  foot?(close: () => void): Child
  onKeyDown?(event: KeyboardEvent): void
  onClose?(): void
}

export interface SheetHandle {
  close(): void
}

export interface ChipScope {
  owner: string
}

export interface ChipItem {
  id: string
  label: string
  status?: Status
  icon?: string
  detail?: Child
  at?: number
  open(): void
}

export interface ChipSource {
  key: string
  label: string
  title: string
  order?: number
  status?: Status
  items(scope: ChipScope): ChipItem[]
}

export type Place = 'overlay' | 'top'

export type Way = 'left' | 'right' | 'up' | 'down'

export interface Swipe {
  move(dx: number): void
  end(velocity: number): void
}

export interface Shell {
  nav(item: NavItem): Dispose
  section(section: ShellSection): Dispose
  route(spec: RouteSpec): Dispose
  open(route: Route, options?: { replace?: boolean }): void
  land(options?: { forget?: Route }): void
  link(route: Route): string
  back(): void
  current(): Route
  state(): ShellState
  sheet(spec: SheetSpec): SheetHandle
  aside(spec: Aside): Dispose
  showAside(id: string, open: boolean): void
  asideOpen(id: string): boolean
  subject(source: SubjectSource): Dispose
  subjectOf(route: Route): Subject | undefined
  chip(source: ChipSource): Dispose
  chipBar(scope: ChipScope): HTMLElement
  row(row: () => ShellRow): HTMLElement
  mount(where: Place, view: HTMLElement, order?: number): Dispose
  swipe(way: Way): Swipe | undefined
}

export const shell = service<Shell>('shell')
export const shellChange = event<(state: ShellState, route: Route) => void>('shell.change')

const loose = (where: Place, view: HTMLElement, order: number): Dispose =>
  mount(byId('stage'), div({ class: 'relative w-full max-h-96 shrink-0 overflow-auto', 'data-place': where, style: { order: String(Math.round(order * 10)) } }, view))

export const place = (ctx: Context, where: Place, view: HTMLElement | (() => HTMLElement), order = 0) =>
  ctx.watch(shell, found => {
    if (!running(ctx)) return
    const { value, scope } = typeof view === 'function' ? collectScope(view) : { value: view, scope: [] }
    const unmount = found ? found.mount(where, value, order) : loose(where, value, order)
    return () => {
      void unmount()
      disposeAll(scope)
    }
  })

export const sheetSlot = (ctx: Context) => {
  let found: Shell | undefined
  let current: { handle: SheetHandle; scope: Dispose[] } | undefined
  let waiting: (() => SheetSpec) | undefined
  const close = () => {
    waiting = undefined
    const shown = current
    current = undefined
    shown?.handle.close()
    disposeAll(shown?.scope ?? [])
  }
  const open = (build: () => SheetSpec) => {
    if (!running(ctx)) return
    if (!found) return void (waiting = build)
    waiting = undefined
    const before = current
    const { value: spec, scope } = collectScope(build)
    const shown = {
      scope,
      handle: found.sheet({
        ...spec,
        onClose() {
          if (current === shown) current = undefined
          disposeAll(scope)
          spec.onClose?.()
        },
      }),
    }
    current = shown
    before?.handle.close()
    disposeAll(before?.scope ?? [])
  }
  ctx.watch(shell, next => {
    found = next
    if (next && waiting) open(waiting)
    return () => {
      close()
      found = undefined
    }
  })
  return { open, close, isOpen: () => Boolean(current ?? waiting) }
}
