import { sleep } from '../time/sleep'
import type { PassedProbe, Probe } from './probe'

export async function* passedInOrder(probes: Promise<Probe>[], headStart: number): AsyncGenerator<PassedProbe> {
  const settled: (Probe | undefined)[] = probes.map(() => undefined)
  let wake = () => {}
  probes.forEach((probe, index) =>
    probe.then(result => {
      settled[index] = result
      wake()
    }),
  )
  await Promise.race([sleep(headStart), Promise.all(probes)])

  const taken = new Set<number>()
  const nextPassed = () => settled.findIndex((probe, index) => probe?.ok === true && !taken.has(index))

  for (;;) {
    const index = nextPassed()
    const probe = settled[index]
    if (probe?.ok) {
      taken.add(index)
      yield probe
      continue
    }
    if (settled.every(result => result !== undefined)) return
    await new Promise<void>(resolve => {
      wake = resolve
    })
  }
}
