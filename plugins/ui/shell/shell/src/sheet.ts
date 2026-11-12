import type { Kit } from '@sand/ui-kit/contract'
import { div, list, type Child } from '@vaakx-dev/vrui'
import type { SheetLook, SheetSpec } from './contract'
import type { Model } from './model'

type SheetView = (kit: Kit, spec: SheetSpec, close: () => void) => HTMLElement

const keysOf = (spec: SheetSpec) => (spec.onKeyDown ? { onKeyDown: spec.onKeyDown } : {})

const frameProps = (spec: SheetSpec, body: string) =>
  spec.alert
    ? { role: 'alertdialog', 'aria-modal': 'true', 'aria-label': spec.label, 'aria-describedby': body, tabIndex: -1, class: 'outline-none', onMount: (node: HTMLElement) => node.focus() }
    : { 'aria-label': spec.label }

const headRow = (kit: Kit, spec: SheetSpec, close: () => void) => {
  const shown = spec.closeButton !== false
  if (!spec.head && !shown) return null
  return div(
    { class: 'flex min-h-12 shrink-0 items-center gap-2 overflow-hidden py-2 pr-2 pl-4', style: kit.stableGutter },
    div({ class: 'flex min-w-0 flex-1 items-center gap-2' }, spec.head?.(close) ?? null),
    shown ? kit.closeButton({ surface: 'raised', onClick: close }) : null,
  )
}

const framed = (kit: Kit, spec: SheetSpec, close: () => void, content: (id: string, head: HTMLElement | null) => Child[]) => {
  const id = `sheet-${crypto.randomUUID()}`
  const head = headRow(kit, spec, close)
  return kit.overlay(close, kit.sheet({ size: spec.size ?? 'md', ...keysOf(spec), ...frameProps(spec, id) }, head, ...content(id, head)))
}

const formSheet: SheetView = (kit, spec, close) =>
  framed(kit, spec, close, (id, head) => [
    kit.sheetBody({ id, class: head ? undefined : 'pt-4' }, spec.body(close)),
    spec.foot ? kit.sheetFoot(spec.foot(close)) : null,
  ])

const bareSheet: SheetView = (kit, spec, close) => framed(kit, spec, close, id => [div({ id, class: 'flex min-h-0 flex-1 flex-col' }, spec.body(close))])

const listSheet: SheetView = (kit, spec, close) =>
  kit.overlay(close, kit.sheet({ grab: close, size: spec.size, 'aria-label': spec.label, ...keysOf(spec) }, spec.head?.(close) ?? null, spec.body(close)))

const searchSheet: SheetView = (kit, spec, close) =>
  kit.screenOverlay(close, kit.sheet({ phone: 'screen', size: spec.size, 'aria-label': spec.label, ...keysOf(spec) }, spec.head?.(close) ?? null, spec.body(close)))

const viewerSheet: SheetView = (kit, spec, close) =>
  kit.viewerShell({ label: spec.label, close, ...keysOf(spec) }, spec.head?.(close) ?? null, spec.body(close))

const views: Record<SheetLook, SheetView> = { form: formSheet, bare: bareSheet, list: listSheet, search: searchSheet, viewer: viewerSheet }

const sheetView = ({ kit, dismissSheet }: Model, spec: SheetSpec) => views[spec.look ?? 'form'](kit, spec, () => dismissSheet(spec))

export const sheetHost = (model: Model) =>
  list(
    model.sheetsShown,
    spec => spec,
    spec => sheetView(model, spec.get()),
    div({ class: 'contents' }),
  )
