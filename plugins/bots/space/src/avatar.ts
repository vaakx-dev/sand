import type { BotColor, BotStatus } from '@sand/bots/contract'
import { derive, dynamicChild, span } from '@vaakx-dev/vrui'
import type { FaceState } from './face/pose'
import { faceView } from './face/view'

export interface Face {
  id: string
  color: BotColor
  status?: BotStatus
}

const states: Record<BotStatus, FaceState> = { idle: 'idle', working: 'working', waiting: 'needs', failed: 'needs' }

export const avatar = (face: () => Face, size: number) => {
  const shown = derive(() => {
    const { id, color, status = 'idle' } = face()
    return { id, color, state: states[status] }
  })
  const key = derive(() => JSON.stringify(shown.get()))
  return span(
    { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
    dynamicChild(key, () => faceView(shown.get(), size)),
  )
}
