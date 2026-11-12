import type { Kit } from '@sand/ui-kit/contract'
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

const discard = (model: RowModel, label: string) => ({
  id: 'discard',
  label,
  danger: true,
  confirm: "Discard every uncommitted change in this folder, new files too? This can't be undone.",
  run: () => model.run('discard', 'raise'),
})

const menu = (kit: Kit, model: RowModel, close: () => void) => {
  const choose = (action: Action) => (event: MouseEvent) => {
    if (action.id === 'discard') kit.confirm(event)(discard(model, action.label))
    else void model.run(action.id, 'report')
    close()
  }
  const item = (action: Action) => kit.menuItem({ role: 'menuitem', tone: action.id === 'discard' ? 'danger' : undefined, onClick: choose(action) }, action.label)
  return div({ class: 'flex flex-col' }, ...model.actions().map(item))
}

export const gitRow = (kit: Kit, model: RowModel) => {
  const item = (props: Omit<Parameters<Kit['cardItem']>[0], 'lead'>) => kit.cardItem({ ...props, lead: kit.icon('commit', 'sm'), end: model.end }, model.label)
  return div(
    { class: 'flex min-w-0 flex-col' },
    dynamicChild(
      () => model.actions().length > 0 && !model.busy(),
      open =>
        open
          ? kit.dropdown({
              class: 'w-full',
              placement: 'below-right',
              trigger: press => item({ ...press, menu: true }),
              items: close => [menu(kit, model, close)],
            })
          : item({}),
    ),
  )
}
