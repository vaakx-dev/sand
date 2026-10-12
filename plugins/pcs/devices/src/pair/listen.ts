import type { Kit } from '@sand/ui-kit/contract'
import { div, sig, span } from '@vaakx-dev/vrui'

export const listenBox = (kit: Kit, text: string, listen: () => Promise<unknown>) => {
  const { callout, secondaryAction } = kit
  const busy = sig(false)
  const run = async () => {
    busy.set(true)
    await listen()
    busy.set(false)
  }
  return callout(
    'neutral',
    div(
      { class: 'flex min-w-0 flex-1 flex-col items-start gap-2' },
      span(text),
      secondaryAction({ size: 'sm', disabled: busy, onClick: () => void run() }, () => (busy.get() ? 'Turning on…' : 'Listen on home network')),
    ),
  )
}
