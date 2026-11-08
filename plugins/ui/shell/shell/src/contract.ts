import { running } from '@sand/reactive'
import { byId, collectScope, disposeAll, div, mount, type Child } from '@vaakx-dev/vrui'
import { event, service, type Context, type Dispose } from 'drydock'

/**
 * How the shell lays itself out, from the width of the app (not the viewport):
 * - `wide` (1000 px and up, or 600 px and up while the open screen has no side frame and isn't split): the sidebar beside one screen.
 * - `drawer` (600–999 px while the open screen has a side frame or is split): the sidebar becomes a drawer behind a toggle in the screen's header.
 * - `phone` (under 600 px): a push/back stack of screens with no sidebar; the root screen is the home list.
 */
export type ShellState = 'phone' | 'drawer' | 'wide'

/**
 * Where something is, as the address keeps it. `kind` picks the route; `id` names the thing it shows;
 * `tab` picks a part inside that screen. Routes round-trip through the URL, so all three are plain strings.
 */
export interface Route {
  kind: string
  id?: string
  tab?: string
}

/** The kind of the home route: "New chat" on wide screens, and the root list screen on phones. */
export const homeRoute = 'home'

/**
 * The state of a piece of work, in urgency order: rows, tabs and chips show the most urgent one.
 * `waiting`, `ready` and `merging` need the user and draw attention; `merged` and `done` are settled.
 */
export const statuses = ['waiting', 'ready', 'merging', 'running', 'merged', 'done'] as const

export type Status = (typeof statuses)[number]

/** A monogram: one or two letters on a tint. `color` is a tint name from the theme, such as a bot's color. */
export interface Monogram {
  initial: string
  color: string
}

/** A menu item, for context menus, send menus and tool actions. The kit draws these. */
export interface MenuAction {
  id: string
  label: string
  icon?: string
  order?: number
  /** Items with the same group sit together between separators. */
  group?: string
  /** Shown as a large button at the top of a phone menu sheet. */
  quick?: boolean
  /** Shown as a tile at the top of a phone menu sheet. */
  tile?: boolean
  active?: boolean
  danger?: boolean
  dot?: () => boolean
  count?: () => number
  /** Asks "confirm" before running. */
  confirm?: string
  /** Opens a sub-list instead of running. */
  choices?: MenuChoice[]
  /** Opens a text field instead of running. */
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
  /** A line under the field for the text so far, or undefined for none. */
  preview(text: string): string | undefined
  run(text: string): void | Promise<unknown>
}

interface NavBase {
  id: string
  label: string
  icon: string
  order?: number
  /**
   * `top` (default) is a row above the groups. `foot` and `foot-end` are icon buttons in one row at the bottom of
   * the sidebar, labelled by a tooltip: `foot` from the left, as Settings is, and `foot-end` from the right, as Reload is.
   */
  place?: 'top' | 'foot' | 'foot-end'
  /** The item's shortcut as a vrui chord, such as `mod+k`, shown dimmed at the end of its row. */
  keys?: string
  count?(): number
  dot?(): boolean
  /** Whether the item is marked current, for one that runs but stands for a screen, such as New chat. */
  current?(): boolean
}

/** A sidebar nav item. One that opens a route is marked current while that route is open; one that runs, such as Search, isn't unless `current` says so. */
export type NavItem = NavBase & ({ to: Route; run?: never } | { run(): void; to?: never })

export interface GroupAction {
  label: string
  icon: string
  run(): void
}

/** Where a row's work lives, such as its project: the left of the row's second line. */
export interface RowPlace {
  label: string
  /** A small mark before the label, such as the project's icon; built in the row's scope. */
  mark?(): Child
}

/**
 * A row in a sidebar group, drawn the same in the sidebar and on the phone home. Line one: monogram, label and
 * the status (phones add its name when it draws attention, or `at`). Line two, shown when the row has any of
 * them: `place` on the left and `trail` on the right.
 */
export interface ShellRow {
  id: string
  label: string
  /** A short label at the right of the title line, such as an event's time. */
  end?: string
  /** When the row's state began, in epoch ms; drawn as a short age such as "4m". */
  at?: number
  mark?: Monogram
  status?: Status
  place?: RowPlace
  /** The right of the second line, such as a branch and its pull requests; built in the row's scope. */
  trail?(): Child
  to: Route
  menu?(): MenuAction[]
}

export interface ShellGroup {
  id: string
  label: string
  action?: GroupAction
  /** Starts collapsed behind its heading and row count; the shell remembers when it's opened. */
  folded?: boolean
  rows: ShellRow[]
}

/**
 * A source of sidebar groups, such as Bots or recent chats. Sections sort by `order`;
 * the shell reads `groups()` reactively, so back it with signals and the sidebar redraws as it changes.
 * On phones the same groups fill the home screen.
 */
export interface ShellSection {
  id: string
  order?: number
  groups(): ShellGroup[]
}

/**
 * A frame beside the main one, such as a bot's Project page. Wide screens show it at about 42% with `label`,
 * `actions` and a Hide button the shell adds; hiding it is remembered per route kind. On phones the screen
 * gets a two-part control, `mainLabel` and `label`, that switches between main and side.
 */
export interface SideFrame {
  label: string
  mainLabel: string
  actions?(): Child
  render(): HTMLElement
}

/**
 * What a route draws. `head` fills the header: a title, a breadcrumb or a tab strip. A plain string becomes the
 * screen's title and its one `h1`; a richer head should name the screen with `kit.barTitle`. The shell adds the
 * back button on phones, the sidebar toggle in the `drawer` state and the show-side button while the side
 * frame is hidden. Each function is called once per screen; return reactive children for anything that changes,
 * reading `state()` to differ between phones and wide screens.
 */
/**
 * A list that takes over the sidebar while its screen is open on wide screens, such as Settings' pages. The shell
 * adds a back button before `label` that returns to where the user was before; phones don't show it.
 */
export interface ScreenNav {
  label: string
  render(): HTMLElement
}

export interface Screen {
  head(): Child
  main(): HTMLElement
  nav?: ScreenNav
  side?: SideFrame
  /** True when `main` lays out its own columns, such as a list beside a page; like a side frame, it makes room by turning the sidebar into a drawer. */
  split?: boolean
}

/**
 * A feature's view. When several plugins register the same kind, the lowest `order` wins, so a feature can
 * stand in for another that's off: threads, bots and the features cover all register `home`.
 * `render` runs once per screen, keyed by kind and id; `route()` is reactive and changes when only `tab` does.
 */
export interface RouteSpec {
  kind: string
  order?: number
  render(route: () => Route): Screen
}

/**
 * A sheet: a bottom sheet on phones, a centred one on wide screens. It closes on Escape and browser back. One shows
 * at a time; opening another replaces it.
 * - `form` (the default): the shell adds the close button after `head`, keeps `foot` in view while `body` scrolls.
 * - `list`: a bottom sheet with a grab handle on phones.
 * - `search`: full screen on phones.
 * `list` and `search` have no close button, and their `head` and `body` lay themselves out.
 */
export type SheetLook = 'form' | 'list' | 'search'

export interface SheetSpec {
  label: string
  look?: SheetLook
  head(close: () => void): Child
  body(close: () => void): Child
  foot?(close: () => void): Child
}

export interface SheetHandle {
  close(): void
}

/**
 * Which work a chip bar counts. `general` is work no owner claims (with no owners, all of it);
 * `owner` is one owner's work, such as a bot's.
 */
export type ChipScope = { kind: 'general' } | { kind: 'owner'; owner: string }

export interface ChipAction {
  label: string
  busy?(): boolean
  run(): void | Promise<unknown>
}

/** A row in a chip's list: Ready rows carry a Merge action, Working rows the time elapsed as `meta`. */
export interface ChipItem {
  id: string
  label: string
  status?: Status
  icon?: string
  meta?: Child
  open?(): void
  action?: ChipAction
}

/**
 * A chip above a composer: a label and a count that opens a short list. Sources with the same `key` show as
 * one chip with their items together, so threads and bots can both add to Waiting. A chip with no items is hidden.
 * `items` is read reactively.
 */
export interface ChipSource {
  key: string
  label: string
  /** The heading of the open list, such as "Waiting for you". */
  title: string
  order?: number
  /** The chip's leading icon, such as `running` for Working's spinner. */
  status?: Status
  items(scope: ChipScope): ChipItem[]
}

/**
 * Places outside screens: `overlay` floats over everything (toasts, prompts, old-style sheets), `top` is a banner
 * strip above the screens, `home` is pinned to the foot of the phone home screen (the launch composer).
 */
export type Place = 'overlay' | 'top' | 'home'

/** A drag the shell follows, for surfaces that swallow touches, such as page frames. */
export interface Swipe {
  move(dx: number): void
  end(velocity: number): void
}

/**
 * The app's frame: sidebar, screens, sheets and chips. It knows no threads and no bots; features fill it.
 * `state()` and `current()` are reactive; `shellChange` fires for code outside a reactive scope.
 */
export interface Shell {
  nav(item: NavItem): Dispose
  section(section: ShellSection): Dispose
  route(spec: RouteSpec): Dispose
  /**
   * Shows a route. Phones push a screen (opening home goes back to the root); wide screens replace the screen.
   * Either way the address follows, so browser back returns. `replace` swaps the current entry instead.
   * A kind nobody registers opens home.
   */
  open(route: Route, options?: { replace?: boolean }): void
  /** Same as browser back: pops a phone screen, or returns to the previous route on wide screens. */
  back(): void
  current(): Route
  state(): ShellState
  sheet(spec: SheetSpec): SheetHandle
  /**
   * Gives an overlay the shell doesn't draw, such as the palette, the history layer a sheet gets: browser back,
   * opening a route and opening a sheet call `close`. Call the returned function when the overlay closes by itself.
   */
  cover(close: () => void): () => void
  chip(source: ChipSource): Dispose
  /** The chips for a scope, for a composer's `above` slot. Call inside the caller's scope; disposing it removes the bar. */
  chipBar(scope: ChipScope): HTMLElement
  mount(where: Place, view: HTMLElement, order?: number): Dispose
  /** The edge swipe the shell would start now: back or forward through the phone stack, the drawer otherwise, or none. */
  swipe(): Swipe | undefined
}

export const shell = service<Shell>('shell')
export const shellChange = event<(state: ShellState, route: Route) => void>('shell.change')

const loose = (where: Place, view: HTMLElement, order: number): Dispose =>
  mount(byId('stage'), div({ class: 'relative w-full max-h-96 shrink-0 overflow-auto', 'data-place': where, style: { order: String(Math.round(order * 10)) } }, view))

/**
 * Mounts a view in a place for as long as the plugin runs. A function view is built when the shell appears and
 * disposed with it. Without a shell, the view still shows at the top of the page, so banners like safe mode survive.
 */
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
