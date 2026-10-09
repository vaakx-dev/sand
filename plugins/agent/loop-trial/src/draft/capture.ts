import type { LoopImpl, Loops } from '@sand/loops/contract'

export const captureLoops = (loops: Loops) => {
  const captured: LoopImpl[] = []
  const service: Loops = {
    register(loop) {
      captured.push(loop)
      return () => {
        const index = captured.indexOf(loop)
        if (index >= 0) captured.splice(index, 1)
      }
    },
    list: () => loops.list(),
    get: name => loops.get(name),
    state: session => loops.state(session),
    choose: (session, name, reason) => loops.choose(session, name, reason),
    defaultName: () => loops.defaultName(),
    setDefault: name => loops.setDefault(name),
    runWith: (loop, session, prompt, overrides) => loops.runWith(loop, session, prompt, overrides),
  }
  return { service, captured }
}
