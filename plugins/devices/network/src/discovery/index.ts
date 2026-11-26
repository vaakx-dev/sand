import type { DiscoveredPc, TailscalePeer } from '@sand/devices-contract'
import { openBeacon } from './beacon'
import { type Found, mergeFound } from './found'
import { createLanFinds } from './lan'
import { findOnTailnet } from './tailnet'

const ANSWER_WAIT_MS = 1_000

interface DiscoveryOptions {
  own: string
  port(): number
  announcing(): boolean
  peers(): Promise<TailscalePeer[]>
  paired(id: string): boolean
  changed(found: DiscoveredPc[]): void
}

export const createDiscovery = async (options: DiscoveryOptions) => {
  let tailnet: Found[] = []
  let list: DiscoveredPc[] = []
  let published = JSON.stringify(list)
  let running: Promise<DiscoveredPc[]> | undefined

  const update = () => {
    const next = mergeFound([...lan.list(), ...tailnet], options.own, options.paired)
    const json = JSON.stringify(next)
    if (json === published) return
    list = next
    published = json
    options.changed(next)
  }

  const lan = createLanFinds(update)
  const beacon = await openBeacon({ id: options.own, port: options.port, announcing: options.announcing, heard: lan.heard })

  const searchTailnet = async () => {
    tailnet = await findOnTailnet(await options.peers().catch(() => []), options.port())
    update()
  }

  const lanAnswers = () => {
    if (!beacon) return
    beacon.ask()
    return Bun.sleep(ANSWER_WAIT_MS)
  }

  const search = async () => {
    await Promise.all([searchTailnet(), lanAnswers()])
    update()
    return list
  }

  const discover = () => {
    running ??= search().finally(() => {
      running = undefined
    })
    return running
  }

  const tick = () => {
    lan.prune()
    beacon?.announce()
  }

  return { list: () => list, discover, tick, announce: () => beacon?.announce(), recheck: update, close: () => beacon?.close() }
}

export type Discovery = Awaited<ReturnType<typeof createDiscovery>>
