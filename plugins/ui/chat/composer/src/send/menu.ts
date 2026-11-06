import type { NavAction } from '@sand/nav/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Model } from '../model'

const queueAction = (model: Model): NavAction => ({ id: 'queue', label: 'Queue for next turn', icon: 'clock', run: () => model.send('queue') })

export const createSendMenu = () => {
  const actions = sig<NavAction[]>([])
  const add = (action: NavAction) => {
    actions.update(list => [...list, action])
    return () => actions.update(list => list.filter(other => other !== action))
  }
  return {
    add,
    actions: (model: Model) => () => [...(model.running.get() ? [queueAction(model)] : []), ...actions.get()],
  }
}

export type SendMenu = ReturnType<typeof createSendMenu>
