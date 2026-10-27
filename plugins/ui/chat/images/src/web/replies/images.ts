import type { Kit } from '@sand/ui-kit/contract'
import type { Threads, Wire } from '@sand/web-client/contract'
import { errorMessage } from '@sand/util'
import { dynamicChild, img, sig, span, type Sig } from '@vaakx-dev/vrui'
import type { ReplyImage, ReplyImages } from '../../contract'
import { imagePath } from '../../path'
import { dataUrlOf } from './integrations/data-url'

type Outcome = { src: string } | { error: string }

const scheme = /^[a-z][\w+.-]+:/i

const onDisk = (src: string) => src.startsWith('file:') || !scheme.test(src)

const replyCache = (kit: Kit, fetchImage: (src: string) => Promise<Outcome>): ReplyImage => {
  const states = new Map<string, Sig<Outcome | undefined>>()

  const load = (src: string, state: Sig<Outcome | undefined>) => {
    state.set(undefined)
    void fetchImage(src)
      .catch(error => ({ error: `Couldn't load ${src}: ${errorMessage(error)}` }))
      .then(outcome => state.set(outcome))
  }

  const stateOf = (src: string) => {
    const known = states.get(src)
    if (known) return known
    const state = sig<Outcome | undefined>(undefined)
    states.set(src, state)
    load(src, state)
    return state
  }

  const view = (alt: string, outcome: Outcome | undefined, retry: () => void) => {
    if (!outcome) return kit.loadingState({ flush: true })
    if ('src' in outcome) return img({ class: 'block max-h-80 max-w-full rounded-md', alt, src: outcome.src })
    return kit.errorState({ flush: true, text: outcome.error, retry })
  }

  return (src, alt) => {
    if (!onDisk(src)) return undefined
    const state = stateOf(src)
    return kit.ownedByNode(() =>
      span(
        { class: 'block' },
        dynamicChild(state, outcome => view(alt, outcome, () => load(src, state))),
      ),
    )
  }
}

export const createReplyImages = (kit: Kit, wire: Wire, threads: Threads): ReplyImages => {
  const fetchImage = async (thread: string, src: string, at: number): Promise<Outcome> => {
    const path = `${imagePath}?${new URLSearchParams({ src, session: thread, before: String(at) })}`
    const response = await wire.fetch(path, undefined, threads.get(thread)?.device)
    if (!response.ok) return { error: `Couldn't load ${src} (${response.status})` }
    return { src: await dataUrlOf(await response.blob()) }
  }

  return { forReply: (thread, at) => replyCache(kit, src => fetchImage(thread, src, at)) }
}
