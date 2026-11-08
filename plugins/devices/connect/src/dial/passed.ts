import type { PassedProbe, Probe } from './probe'

export async function* passedAsTheyCome(probes: Promise<Probe>[]): AsyncGenerator<PassedProbe> {
  const pending = new Map(probes.map((probe, index) => [index, probe.then(result => ({ index, result }))]))
  while (pending.size) {
    const { index, result } = await Promise.race(pending.values())
    pending.delete(index)
    if (result.ok) yield result
  }
}
