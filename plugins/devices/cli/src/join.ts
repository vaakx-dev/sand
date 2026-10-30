import { type DiscoveredPc, type OutgoingJoin, type OutgoingOutcome, pairJoin, pairJoinResult, pcsDiscover } from '@sand/devices-contract'
import type { Daemon } from '@sand/host-daemon/contract'
import { platformName, routeName } from './describe'
import { heardEvents } from './events'
import { withLink } from './link'

const joinTimeout = 30_000
const answerGrace = 30_000

const foundLine = (pc: DiscoveredPc) => `  ${pc.name}  (${platformName(pc.platform)}, ${routeName(pc.via)})  sand devices join ${pc.url}`

const listFound = async (daemon: Daemon) => {
  const found = (await daemon.request(pcsDiscover, {})).filter(pc => !pc.paired)
  if (!found.length) return console.log('found no other sand PCs nearby; pass the address of one, or a PC pairing link: sand devices join <link | address>')
  console.log(['sand PCs found nearby:', ...found.map(foundLine)].join('\n'))
}

const outcomeError = (join: OutgoingJoin, outcome: Exclude<OutgoingOutcome, 'approved'>, error?: string) => {
  if (outcome === 'denied') return new Error(`${join.name} turned this PC away`)
  if (outcome === 'expired') return new Error(`nobody answered in time; run \`sand devices join ${join.url}\` again`)
  if (outcome === 'cancelled') return new Error(`the request to join ${join.name} was cancelled`)
  return new Error(`could not join ${join.name}: ${error ?? 'it stopped answering'}`)
}

export const joinPc = (daemon: Daemon, target?: string) => {
  if (!target) return listFound(daemon)
  return withLink(daemon, async link => {
    const results = heardEvents(link, pairJoinResult)
    const join = await link.call(pairJoin, { url: target }, { timeout: joinTimeout })
    if (!join.code) return console.log(`joined ${join.name}`)
    console.log(`asked ${join.name} to let this PC in; tap Allow on one of your phones or browsers, where it shows code ${join.code}`)
    const result = await results(heard => heard.id === join.id, join.expires + answerGrace)
    if (!result) throw outcomeError(join, 'expired')
    if (result.outcome !== 'approved') throw outcomeError(join, result.outcome, result.error)
    console.log(`joined ${join.name}`)
  })
}
