import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { SheetLook, SheetSpec } from './contract'
import type { Model } from './model'

type SheetView = (kit: Kit, spec: SheetSpec, close: () => void) => HTMLElement

const formSheet: SheetView = (kit, spec, close) =>
  kit.overlay(
    close,
    kit.sheet(
      { size: 'md', 'aria-label': spec.label },
      div(
        { class: 'flex min-h-12 shrink-0 items-center gap-2 overflow-hidden py-2 pr-2 pl-4', style: kit.stableGutter },
        div({ class: 'flex min-w-0 flex-1 items-center gap-2' }, spec.head(close)),
        kit.closeButton({ surface: 'raised', onClick: close }),
      ),
      kit.sheetBody({}, spec.body(close)),
      spec.foot ? kit.sheetFoot(spec.foot(close)) : null,
    ),
  )

const listSheet: SheetView = (kit, spec, close) => kit.overlay(close, kit.sheet({ grab: close, 'aria-label': spec.label }, spec.head(close), spec.body(close)))

const searchSheet: SheetView = (kit, spec, close) =>
  kit.screenOverlay(close, kit.sheet({ phone: 'screen', 'aria-label': spec.label }, spec.head(close), spec.body(close)))

const views: Record<SheetLook, SheetView> = { form: formSheet, list: listSheet, search: searchSheet }

const sheetView = ({ kit, closeSheet }: Model, spec: SheetSpec) => views[spec.look ?? 'form'](kit, spec, () => closeSheet(spec))

export const sheetHost = (model: Model) => dynamicChild(model.sheetShown, spec => (spec ? sheetView(model, spec) : null))
