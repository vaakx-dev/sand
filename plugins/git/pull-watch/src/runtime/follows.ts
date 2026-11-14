import type { Session, Sessions } from '@sand/chats/contract'
import { type GitHub, type PullRef, pullRefOf } from '@sand/github/contract'
import type { Watch, Watches } from '@sand/watches/contract'
import { keyedSerial } from '@sand/util'
import { z } from 'zod'
import type { FollowedPull } from '../contract'
import { pullInput } from './kind'

export interface FollowsDeps {
  watches: Watches
  sessions: Sessions
  github: Pick<GitHub, 'rest'>
}

export const OWNER = 'threads'

const KIND = 'github-pull'

const shortForm = /^([\w.-]+\/[\w.-]+)#(\d+)$/

const content = z.object({ title: z.string(), url: z.string() })

const refOf = (text: string): PullRef => {
  const short = shortForm.exec(text.trim())
  const found = short?.[1] && short[2] ? { repo: short[1], number: Number(short[2]) } : pullRefOf(text.trim())
  if (!found) throw new Error(`${text} isn't a pull request; give its URL or owner/name#number.`)
  return found
}

const sameRef = (watch: Watch, { repo, number }: PullRef) => {
  const input = pullInput.safeParse(watch.input).data
  return watch.kind === KIND && input?.repo.toLowerCase() === repo.toLowerCase() && input.number === number
}

export const followedOf = (watch: Watch): FollowedPull => {
  const { repo, number } = pullInput.parse(watch.input)
  const { title, url } = content.parse(watch.data)
  return {
    id: watch.id,
    thread: watch.subject,
    repo,
    number,
    url,
    title,
    ...(watch.changed !== undefined && { changed: watch.changed }),
    ...(watch.error && { error: watch.error }),
  }
}

export const createFollows = ({ watches, sessions, github }: FollowsDeps) => {
  const serially = keyedSerial()

  const rootOf = (session: Session): Session => {
    const parent = session.kind === 'agent' && session.parent ? sessions.open(session.parent) : undefined
    return parent ? rootOf(parent) : session
  }

  const rootId = (id: string) => {
    const session = sessions.open(id)
    return session ? rootOf(session).id : id
  }

  const threadOf = (id: string) => {
    if (!sessions.open(id)) throw new Error(`No thread ${id}`)
    return rootId(id)
  }

  const find = (thread: string, ref: PullRef) => watches.list(OWNER, thread).find(watch => sameRef(watch, ref))

  const titled = async ({ repo, number }: PullRef) => {
    const pull = await github.rest<{ title: string; html_url: string }>('GET', `/repos/${repo}/pulls/${number}`)
    return { title: pull.title, url: pull.html_url }
  }

  const add = async (thread: string, ref: PullRef) => {
    const known = find(thread, ref)
    if (known) return followedOf(known)
    const data = await titled(ref)
    const watch = await watches.create({ owner: OWNER, subject: thread, kind: KIND, input: { ...ref }, label: `PR #${ref.number}`, data })
    return followedOf(watch)
  }

  const follow = (id: string, ref: PullRef) => {
    const thread = threadOf(id)
    return serially(`${thread}\0${ref.repo.toLowerCase()}#${ref.number}`, () => add(thread, ref))
  }

  return {
    thread: rootId,
    list: (id: string) => watches.list(OWNER, rootId(id)).filter(watch => watch.kind === KIND).map(followedOf),
    follow,
    followText: (thread: string, pull: string) => follow(thread, refOf(pull)),
    unfollow(id: string, pull: string) {
      const found = find(rootId(id), refOf(pull))
      return found ? watches.remove(found.id) : false
    },
    forget(thread: string) {
      for (const watch of watches.list(OWNER, thread)) watches.remove(watch.id)
    },
  }
}

export type Follows = ReturnType<typeof createFollows>
