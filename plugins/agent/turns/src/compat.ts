import type { Loop } from '@sand/loop/contract'
import type { Turns } from '@sand/turns-contract/contract'

export const loopOf = (turns: Turns): Loop => ({
  run: (session, prompt, signal) => turns.run(session, prompt, { signal }),
  interrupt: session => turns.interrupt(session),
  active: session => Boolean(turns.current(session)),
})
