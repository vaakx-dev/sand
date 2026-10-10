import type { Hello } from '@sand/protocol'
import { helloParts } from '@sand/kit'

export const trimHello = (hello: Hello, known?: string): Hello => {
  const { fresh, shared } = helloParts(hello)
  const tag = Bun.hash(JSON.stringify(shared)).toString(36)
  return known === tag ? ({ ...fresh, tag, same: true } as Hello) : { ...hello, tag }
}
