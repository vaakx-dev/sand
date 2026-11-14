import type { Pull, PullState } from '@sand/github/contract'
import type { Kit, Tone } from '@sand/ui-kit/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import { derive, div, list, span, type Sig } from '@vaakx-dev/vrui'
import type { FollowedPull } from '../contract'

export interface Item {
  url: string
  number: number
  title: string
  state?: PullState
  following: boolean
  error?: string
}

export interface RowsModel {
  items(): Item[]
  follow(item: Item): Promise<unknown>
  unfollow(item: Item): Promise<unknown>
  open(url: string): void
}

const TONES: Record<PullState, Tone> = { open: 'success', merged: 'merged', draft: 'neutral', closed: 'neutral' }

const LIVE = new Set<PullState>(['open', 'draft'])

export const itemsOf = (followed: FollowedPull[], pulls: Pull[]): Item[] => {
  const stateOf = new Map(pulls.map(pull => [pull.url, pull.state]))
  const following = new Set(followed.map(pull => pull.url))
  const kept = followed.map(pull => ({ url: pull.url, number: pull.number, title: pull.title, state: stateOf.get(pull.url), following: true, ...(pull.error && { error: pull.error }) }))
  const offered = pulls.filter(pull => LIVE.has(pull.state) && !following.has(pull.url)).map(pull => ({ ...pull, following: false }))
  return [...kept, ...offered]
}

const toneOf = (kit: Kit, { state = 'open' }: Item) => kit.toneText[TONES[state]]

const actionsOf = (model: RowsModel, item: Item): MenuAction[] => [
  item.following
    ? { id: 'unfollow', label: 'Stop following', icon: 'eye', run: () => model.unfollow(item) }
    : { id: 'follow', label: 'Follow', icon: 'eye', run: () => model.follow(item) },
  { id: 'open', label: 'Open on GitHub', icon: 'external', run: () => model.open(item.url) },
]

const endOf = (item: Item) => {
  if (item.error) return 'Not reachable'
  return item.following ? 'Following' : ''
}

const itemView = (kit: Kit, model: RowsModel, item: Sig<Item>) => {
  const menu = kit.contextMenu()
  const spec = () => ({ title: `PR #${item.get().number}`, subtitle: item.get().title, actions: actionsOf(model, item.get()) })
  return div(
    { class: 'flex min-w-0 flex-col' },
    kit.cardItem(
      {
        ...menu.target(spec, event => menu.openBelow(event, spec)),
        'aria-haspopup': 'menu',
        menu: true,
        title: () => item.get().error ?? item.get().title,
        lead: kit.icon('pull-request', 'sm'),
        end: () => endOf(item.get()),
      },
      span({ class: () => toneOf(kit, item.get()) }, () => `#${item.get().number}`),
      ' ',
      () => item.get().title,
    ),
    menu.view(),
  )
}

export const pullRows = (kit: Kit, model: RowsModel) =>
  list(
    derive(model.items),
    item => item.url,
    item => itemView(kit, model, item),
    div({ class: 'flex min-w-0 flex-col' }),
  )
