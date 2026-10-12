import { derive } from '@vaakx-dev/vrui'
import type { TabModel } from '../tab/model'
import { recent } from '../tab/recent'

export type ControlMode = 'idle' | 'user' | 'agent'

const drivingMs = 4000

export const controlMode = (tab: TabModel) => {
  const fresh = recent(tab.action, drivingMs)
  return derive<ControlMode>(() => {
    const state = tab.state.get()
    if (!state) return 'idle'
    if (state.driver === 'user') return 'user'
    return state.acting || fresh.get() ? 'agent' : 'idle'
  })
}
