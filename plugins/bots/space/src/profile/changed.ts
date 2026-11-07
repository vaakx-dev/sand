import { div, span } from '@vaakx-dev/vrui'
import type { BotsContext } from '../context'

export const changedNote = ({ linkButton }: BotsContext['kit'], message: string, reload: () => void) =>
  div({ class: 'flex flex-wrap items-center gap-2 text-xs text-neutral-400' }, span(message), linkButton({ onClick: reload }, 'Load its version'))
