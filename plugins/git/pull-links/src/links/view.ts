import type { GitHub, PullSummary } from '@sand/github/contract'
import type { PullLink, ThreadPulls } from '../contract'
import { refOf, type StoredLink, type StoredLinks } from '../book/record'

const summaryOf = (github: GitHub, link: StoredLink): Promise<PullSummary | undefined> => github.summary(refOf(link)).catch(() => undefined)

const shown = async (github: GitHub, link: StoredLink): Promise<PullLink> => {
  const summary = await summaryOf(github, link)
  return { ...refOf(link), source: link.source, linked: link.linked, watching: link.watching, ...(summary && { summary }) }
}

export const threadPulls = async (github: GitHub, session: string, links: StoredLinks): Promise<ThreadPulls> => ({
  session,
  links: await Promise.all(links.links.map(link => shown(github, link))),
})
