import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, p, sig } from '@vaakx-dev/vrui'
import type { Action, ActionId } from './actions'

export interface RowModel {
  actions(): Action[]
  label(): string
  end(): string
  busy(): boolean
  run(id: ActionId): void
}

const confirmText = "Discard every uncommitted change in this folder, new files too? This can't be undone."

const confirmView = (kit: Kit, back: () => void, discard: () => void) =>
  div(
    { class: 'flex max-w-64 flex-col gap-3 p-2' },
    p({ class: 'text-sm text-neutral-100' }, confirmText),
    div(
      { class: 'flex justify-end gap-2' },
      kit.secondaryAction({ size: 'sm', onClick: back, onMount: node => node.focus() }, 'Cancel'),
      kit.controlButton(kit.actionTones.danger, { size: 'sm', onClick: discard }, 'Discard'),
    ),
  )

const menu = (kit: Kit, model: RowModel, close: () => void) => {
  const confirming = sig(false)
  const run = (id: ActionId) => {
    close()
    model.run(id)
  }
  const item = (action: Action) =>
    kit.menuItem(
      {
        role: 'menuitem',
        tone: action.id === 'discard' ? 'danger' : undefined,
        onClick: () => (action.id === 'discard' ? confirming.set(true) : run(action.id)),
      },
      action.label,
    )
  return dynamicChild(confirming, asking =>
    asking
      ? confirmView(kit, () => confirming.set(false), () => run('discard'))
      : div({ class: 'flex flex-col' }, ...model.actions().map(item)),
  )
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
