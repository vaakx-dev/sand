import { type DiscoveredPc, pairJoin, pairJoinResult, pcsDiscover, unjoinedText } from '@sand/devices-contract'
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

export const joinPc = (daemon: Daemon, target?: string) => {
  if (!target) return listFound(daemon)
  return withLink(daemon, async link => {
    const results = heardEvents(link, pairJoinResult)
    const join = await link.call(pairJoin, { url: target }, { timeout: joinTimeout })
    if (!join.code) return console.log(`joined ${join.name}`)
    console.log(`asked ${join.name} to let this PC in; tap Allow on one of your phones or browsers, where it shows code ${join.code}`)
    const result = await results(heard => heard.id === join.id, join.expires + answerGrace)
    if (!result) throw new Error(unjoinedText(join.name, 'expired'))
    if (result.outcome !== 'approved') throw new Error(unjoinedText(join.name, result.outcome, result.error))
    console.log(`joined ${join.name}`)
  })
}
