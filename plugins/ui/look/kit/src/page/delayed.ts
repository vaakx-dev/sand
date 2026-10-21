import { effect, onTimeout, read, sig, untrack, type MaybeReactive } from '@vaakx-dev/vrui'

const delayMs = 400

export const delayed = (active: MaybeReactive<boolean>) => {
  const shown = sig(false)
  let since = 0
  effect(() => {
    const on = read(active)
    if (on === untrack(() => shown.get())) return
    onTimeout(
      () => {
        since = Date.now()
        shown.set(on)
      },
      on ? delayMs : Math.max(0, since + delayMs - Date.now()),
    )
  })
  return shown
}
