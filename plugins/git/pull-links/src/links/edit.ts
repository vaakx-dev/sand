import type { PullRef } from '@sand/github/contract'
import type { LinkSource } from '../contract'
import { refOf, samePull, type StoredLink, type StoredLinks, type WatchMark } from '../book/record'

export const findLink = (links: StoredLinks, pull: PullRef) => links.links.find(link => samePull(link, pull))

export const isDismissed = (links: StoredLinks, pull: PullRef) => links.dismissed.some(ref => samePull(ref, pull))

const replaced = (links: StoredLinks, pull: PullRef, change: (link: StoredLink) => StoredLink): StoredLinks => ({
  ...links,
  links: links.links.map(link => (samePull(link, pull) ? change(link) : link)),
})

export const withLink = (links: StoredLinks, pull: PullRef, source: LinkSource, now: number): StoredLinks => {
  if (findLink(links, pull)) return links
  return {
    links: [...links.links, { ...refOf(pull), source, linked: now, watching: false }],
    dismissed: links.dismissed.filter(ref => !samePull(ref, pull)),
  }
}

export const withoutLink = (links: StoredLinks, pull: PullRef): StoredLinks => {
  if (!findLink(links, pull)) return links
  return {
    links: links.links.filter(link => !samePull(link, pull)),
    dismissed: [...links.dismissed.filter(ref => !samePull(ref, pull)), refOf(pull)],
  }
}

const watched = ({ mark, quiet, ...link }: StoredLink, on: boolean): StoredLink => ({ ...link, watching: on })

export const withWatch = (links: StoredLinks, pull: PullRef, on: boolean): StoredLinks => {
  const link = findLink(links, pull)
  if (!link || link.watching === on) return links
  return replaced(links, pull, link => watched(link, on))
}

export const withoutWatching = (links: StoredLinks): StoredLinks =>
  links.links.some(link => link.watching) ? { ...links, links: links.links.map(link => (link.watching ? watched(link, false) : link)) } : links

export const withMark = (links: StoredLinks, pull: PullRef, mark: WatchMark, quiet: number, keepWatching: boolean): StoredLinks => {
  const link = findLink(links, pull)
  if (!link?.watching) return links
  return replaced(links, pull, link => (keepWatching ? { ...link, mark, quiet } : watched(link, false)))
}
