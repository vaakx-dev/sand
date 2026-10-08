import { Sig, type MaybeReactive } from '@vaakx-dev/vrui'

export const read = <T>(value: MaybeReactive<T>): T => {
  if (value instanceof Sig) return value.get()
  return typeof value === 'function' ? (value as () => T)() : value
}
