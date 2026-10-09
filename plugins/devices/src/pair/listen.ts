import { div, p, secondaryAction, sig } from '@sand/dom'

export const listenBox = (text: string, listen: () => Promise<void>) => {
  const busy = sig(false)
  const run = async () => {
    busy.set(true)
    await listen()
    busy.set(false)
  }
  return div(
    { class: 'flex flex-col items-start gap-3 rounded-xl bg-neutral-900 px-4 py-3' },
    p({ class: 'text-xs text-neutral-400' }, text),
    secondaryAction({ size: 'sm', disabled: busy, onClick: () => void run() }, () => (busy.get() ? 'Turning on…' : 'Listen on home network')),
  )
}
