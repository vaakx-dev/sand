import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { Action, ActionId } from './actions'

export type Failure = 'report' | 'raise'

export interface RowModel {
  actions(): Action[]
  label(): string
  end(): string
  busy(): boolean
  run(id: ActionId, failure: Failure): Promise<void>
}

const discard = (model: RowModel, label: string): MenuAction => ({
  id: 'discard',
  label,
  group: 'discard',
  danger: true,
  confirm: "Discard every uncommitted change in this folder, new files too? This can't be undone.",
  run: () => model.run('discard', 'raise'),
})

const menuAction = (model: RowModel, action: Action): MenuAction =>
  action.id === 'discard' ? discard(model, action.label) : { id: action.id, label: action.label, run: () => model.run(action.id, 'report') }

const menuSpec = (model: RowModel): MenuSpec => ({ title: model.label(), actions: model.actions().map(action => menuAction(model, action)) })

export const gitRow = (kit: Kit, model: RowModel) => {
  const menu = kit.contextMenu()
  const spec = () => menuSpec(model)
  const item = (props: Omit<Parameters<Kit['cardItem']>[0], 'lead'>) => kit.cardItem({ ...props, lead: kit.icon('commit', 'sm'), end: model.end }, model.label)
  return div(
    { class: 'flex min-w-0 flex-col' },
    dynamicChild(
      () => model.actions().length > 0 && !model.busy(),
      open => (open ? item({ ...menu.target(spec, event => menu.openBelow(event, spec)), 'aria-haspopup': 'menu', menu: true }) : item({})),
    ),
    menu.view(),
  )
}
