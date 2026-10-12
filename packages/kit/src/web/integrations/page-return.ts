import { joinDisposers } from '../../dispose/join'
import { listen } from '@vaakx-dev/vrui'

const gapMs = 5_000

export const onPageReturn = (handler: () => void) => {
  let last = 0
  const returned = () => {
    if (document.visibilityState !== 'visible' || Date.now() - last < gapMs) return
    last = Date.now()
    handler()
  }
  return joinDisposers(listen(window, 'focus', returned), listen(document, 'visibilitychange', returned))
}
