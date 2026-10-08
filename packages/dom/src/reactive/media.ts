import { onMedia, sig, type Sig } from '@vaakx-dev/vrui'

export const media = (query: string): Sig<boolean> => {
  const matches = sig(false)
  onMedia(query, value => matches.set(value))
  return matches
}

export const finePointer = () => media('(pointer: fine)')
