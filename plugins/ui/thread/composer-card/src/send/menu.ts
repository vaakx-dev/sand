import type { NavAction } from '@sand/protocol'
import { sig } from '@vaakx-dev/vrui'

export const createSendMenu = () => {
  const actions = sig<NavAction[]>([])
  const add = (action: NavAction) => {
    actions.update(list => [...list, action])
    return () => actions.update(list => list.filter(other => other !== action))
  }
  return { actions, add }
}

export type SendMenu = ReturnType<typeof createSendMenu>
