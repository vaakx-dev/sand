import { derive, show, span } from '@vaakx-dev/vrui'
import type { ViewParts } from './parts'
import { scopeMenu } from './scope-menu'

export const toolbar = (parts: ViewParts) => {
  const { kit, model, layout } = parts
  const { icon, iconButton, layer, lineStat, paneHead } = kit
  const totals = derive(() => {
    const state = model.list.get()
    return state.kind === 'ready' ? state.list : undefined
  })
  return paneHead(
    { class: [layer.menu, 'sticky top-0 bg-neutral-950'] },
    show(model.repo.map(Boolean), () => scopeMenu(parts)),
    show(totals.map(Boolean), () =>
      lineStat(
        () => totals.get()?.add ?? 0,
        () => totals.get()?.del ?? 0,
      ),
    ),
    span({ class: 'flex-1' }),
    layout.splitButton(),
    iconButton({ title: 'Refresh changes', 'aria-label': 'Refresh changes', onClick: model.reload }, icon('reload', 16)),
  )
}
