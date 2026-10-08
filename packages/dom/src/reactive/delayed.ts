import { effect, onTimeout, sig, untrack, type MaybeReactive } from '@vaakx-dev/vrui'
import { read } from './read'

export const delayed = (active: MaybeReactive<boolean>, ms = 400) => {
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
      on ? ms : Math.max(0, since + ms - Date.now()),
    )
  })
  return shown
}
