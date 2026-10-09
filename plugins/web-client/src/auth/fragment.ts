import { pairSecret } from '@sand/kit'

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
      const listener = () => {
        const secret = takeFromHash()
        if (!secret) return
        pending = secret
        changed()
      }
      addEventListener('hashchange', listener)
      return () => removeEventListener('hashchange', listener)
    },
  }
}
