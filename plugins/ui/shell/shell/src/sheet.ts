import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { SheetSpec } from './contract'
import type { Model } from './model'

const sheetView = ({ kit, closeSheet }: Model, spec: SheetSpec) => {
  const close = () => closeSheet(spec)
  return kit.overlay(
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
}

export const sheetHost = (model: Model) => dynamicChild(model.sheetShown, spec => (spec ? sheetView(model, spec) : null))
