import type { Threads, Wire } from '@sand/web-client/contract'
import { errorMessage, img } from '@sand/dom'
import type { ReplyImage, ReplyImages } from '../contract'
import { imagePath } from '../path'
import { dataUrlOf } from './integrations/data-url'

type Outcome = { src: string } | { title: string }

const scheme = /^[a-z][\w+.-]+:/i

const onDisk = (src: string) => src.startsWith('file:') || !scheme.test(src)

const replyCache = (fetchImage: (src: string) => Promise<Outcome>): ReplyImage => {
  const loads = new Map<string, Promise<Outcome>>()
  const outcomes = new Map<string, Outcome>()

  const load = (src: string) => {
    const running =
      loads.get(src) ??
      fetchImage(src)
        .catch(error => ({ title: errorMessage(error) }))
        .then(outcome => {
          outcomes.set(src, outcome)
          return outcome
        })
    loads.set(src, running)
    return running
  }

  return (src, alt) => {
    if (!onDisk(src)) return undefined
    const known = outcomes.get(src)
    const image = img({ class: 'block max-h-80 max-w-full rounded-md', alt, ...known })
    if (!known) void load(src).then(outcome => Object.assign(image, outcome))
    return image
  }
}

export const replyImages = (wire: Wire, threads: Threads): ReplyImages => {
  const fetchImage = async (thread: string, src: string): Promise<Outcome> => {
    const path = `${imagePath}?${new URLSearchParams({ src, session: thread })}`
    const response = await wire.fetch(path, undefined, threads.get(thread)?.device)
    if (!response.ok) return { title: `Could not load ${src} (${response.status})` }
    return { src: await dataUrlOf(await response.blob()) }
  }

  return { forReply: thread => replyCache(src => fetchImage(thread, src)) }
}
