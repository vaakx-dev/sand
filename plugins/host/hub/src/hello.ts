import type { RuntimeView } from '@sand/host-runtimes/contract'
import { type Hello, helloActive } from './contract'

export const mergeHello = (hello: Hello, others: RuntimeView[]): Hello => {
  const active = new Set(hello.fresh[helloActive.id] as string[] | undefined)
  for (const runtime of others) {
    if (runtime.state !== 'draining') continue
    for (const session of runtime.activity.sessions) active.add(session)
  }
  return { ...hello, fresh: { ...hello.fresh, [helloActive.id]: [...active] } }
}
