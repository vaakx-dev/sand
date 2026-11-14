import type { Pull, PullState } from '@sand/github/contract'
import type { Kit, Tone } from '@sand/ui-kit/contract'
import { derive, div, list, span, type Sig } from '@vaakx-dev/vrui'
import type { FollowedPull } from '../contract'

export interface Item {
  url: string
  number: number
  title: string
  state?: PullState
  following: boolean
  changed?: number
  error?: string
}

export interface RowsModel {
  items(): Item[]
  show(item: Item): void
}

const TONES: Record<PullState, Tone> = { open: 'success', merged: 'merged', draft: 'neutral', closed: 'neutral' }

const LIVE = new Set<PullState>(['open', 'draft'])

export const itemsOf = (followed: FollowedPull[], pulls: Pull[]): Item[] => {
  const stateOf = new Map(pulls.map(pull => [pull.url, pull.state]))
  const following = new Set(followed.map(pull => pull.url))
  const kept = followed.map(({ id, thread, repo, ...pull }) => ({ ...pull, state: stateOf.get(pull.url), following: true }))
  const offered = pulls.filter(pull => LIVE.has(pull.state) && !following.has(pull.url)).map(pull => ({ ...pull, following: false }))
  return [...kept, ...offered]
}

const toneOf = (kit: Kit, { state = 'open' }: Item) => kit.toneText[TONES[state]]

const endOf = (item: Item) => {
  if (item.error) return 'Not reachable'
  return item.following ? 'Following' : ''
}

const itemView = (kit: Kit, model: RowsModel, item: Sig<Item>) =>
  kit.cardItem(
    {
      onClick: () => model.show(item.get()),
      title: () => item.get().error ?? item.get().title,
      lead: kit.icon('pull-request', 'sm'),
      end: () => endOf(item.get()),
    },
    span({ class: () => toneOf(kit, item.get()) }, () => `#${item.get().number}`),
    ' ',
    () => item.get().title,
  )

export const pullRows = (kit: Kit, model: RowsModel) =>
  list(
    derive(model.items),
    item => item.url,
    item => itemView(kit, model, item),
    div({ class: 'flex min-w-0 flex-col' }),
  )
