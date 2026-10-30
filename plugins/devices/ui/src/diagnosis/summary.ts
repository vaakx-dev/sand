import type { PcTone } from '@sand/devices-contract'
import { agoWords, dateWords } from '../shared/time'
import { routeWords, toneOf } from '../status/words'
import { type Facts, homeReaches } from './facts'

export interface Summary {
  tone: PcTone
  title: string
  text?: string
}

const reachNote = (facts: Facts) => (homeReaches(facts) ? `${facts.homeName} can reach it, so it’s on.` : undefined)

const joined = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' ') || undefined

export const summaryOf = (facts: Facts): Summary => {
  const { name, device, view } = facts
  const status = view?.status ?? { phase: 'offline' as const }
  const tone = toneOf(status)
  if (status.phase === 'connected') {
    if (status.route.kind !== 'via') return { tone, title: `${name} is connected over ${routeWords(status.route, facts.nameOf)}.` }
    const through = facts.nameOf(status.route.via ?? '')
    return {
      tone,
      title: `${name} works, but only through ${through}.`,
      text: `Its own addresses didn’t answer. Going through ${through} is slower and stops when ${through} is off.`,
    }
  }
  if (status.phase === 'offline')
    return { tone, title: `${name} is offline.`, text: joined(view?.seen ? `Last seen ${agoWords(view.seen)}.` : undefined, reachNote(facts), 'sand keeps trying on its own.') }
  if (status.phase !== 'blocked') return { tone, title: `Can’t reach ${name} right now.`, text: joined(reachNote(facts), 'sand keeps trying on its own.') }
  if (status.reason === 'removed') {
    const by = status.by ? ` by ${status.by}` : ''
    const on = status.at ? ` on ${dateWords(status.at)}` : ''
    return { tone, title: `${device} was removed${by}${on}.`, text: `sand stopped trying. To use ${name} here again, ask to join again.` }
  }
  if (status.reason === 'not-paired') return { tone, title: `${name} doesn’t know ${device.toLowerCase()}.`, text: 'sand stopped trying until it’s added again.' }
  if (status.reason === 'wrong-pc')
    return { tone, title: `A different PC answers at ${name}’s address.`, text: 'sand stopped trying so it doesn’t talk to the wrong PC.' }
  return { tone, title: `sand doesn’t know a way to reach ${name} from here.`, text: reachNote(facts) }
}
