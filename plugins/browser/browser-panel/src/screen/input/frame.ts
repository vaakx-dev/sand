import { onRaf } from '@sand/dom'

export const perFrame = <T>(send: (value: T) => void, merge: (previous: T, next: T) => T = (_, next) => next) => {
  let pending: T | undefined
  let cancel: (() => void) | undefined

  const drop = () => {
    cancel?.()
    cancel = undefined
    pending = undefined
  }

  const flush = () => {
    const value = pending
    drop()
    if (value !== undefined) send(value)
  }

  return {
    push(value: T, owner: Node) {
      pending = pending === undefined ? value : merge(pending, value)
      cancel ??= onRaf(flush, owner)
    },
    flush,
    drop,
  }
}
