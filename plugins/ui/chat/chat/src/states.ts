import type { Kit } from '@sand/ui-kit/contract'
import { div, type Child } from '@vaakx-dev/vrui'

const stateFrame = (state: Child) => div({ class: 'flex justify-center pt-4' }, state)

export const failed = ({ errorState }: Kit, message: string, retry: () => void) => stateFrame(errorState({ text: `Couldn't load this thread: ${message}`, retry }))

export const loading = ({ loadingState }: Kit) => stateFrame(loadingState())
