import type { MenuAction } from '@sand/ui-shell/contract'
import { sig } from '@vaakx-dev/vrui'

export const createSendMenu = () => {
  const actions = sig<MenuAction[]>([])
  const add = (action: MenuAction) => {
    actions.update(list => [...list, action])
    return () => actions.update(list => list.filter(other => other !== action))
  }
  return {
    add,
    actions: () => actions.get(),
  }
}

export type SendMenu = ReturnType<typeof createSendMenu>
