import { listen } from '@vaakx-dev/vrui'
import { pairSecret } from '@sand/host-remotes/pairing'

const takeFromHash = () => {
  const secret = pairSecret(location.hash)
  if (secret) history.replaceState(history.state, '', location.pathname + location.search)
  return secret
}

export const pairFragment = () => {
  let pending = takeFromHash()
  return {
    take() {
      const secret = pending
      pending = undefined
      return secret
    },
    clear() {
      pending = undefined
    },
    watch(changed: () => void) {
      return listen(window, 'hashchange', () => {
        const secret = takeFromHash()
        if (!secret) return
        pending = secret
        changed()
      })
    },
  }
}
