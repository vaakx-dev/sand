import { z } from 'zod'
import type { StoredLink, StoredLinks } from '../book/record'

export const pickInput = z.object({
  number: z.number().int().positive().optional().describe("The pull request's number. Leave it out when the thread has one linked pull request."),
})

export const pickLink = (links: StoredLinks, number?: number): StoredLink => {
  if (number !== undefined) {
    const link = links.links.find(link => link.number === number)
    if (!link) throw new Error(`#${number} isn't linked to this thread. Link it with link_pull_request first.`)
    return link
  }
  const [only, ...rest] = links.links
  if (only && !rest.length) return only
  if (!only) throw new Error('This thread has no linked pull requests. Link one with link_pull_request.')
  throw new Error(`This thread has ${links.links.length} linked pull requests (${links.links.map(link => `#${link.number}`).join(', ')}). Say which number.`)
}
