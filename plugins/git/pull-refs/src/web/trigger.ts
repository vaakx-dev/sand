import type { Trigger, TriggerItem } from '@sand/composer/contract'
import type { PullSummary } from '@sand/github/contract'
import { pullRecord, type PullSnapshot } from '../pull'
import { pickPulls } from './pick'

interface PullItem extends TriggerItem {
  pull: PullSnapshot
}

export interface PullSources {
  linked(): PullSummary[]
  inbox(): Promise<PullSummary[]>
}

export const pullTrigger = (sources: PullSources): Trigger<PullItem> => ({
  char: '#',
  label: 'PRs',
  async items(query) {
    const pulls = [...sources.linked(), ...(await sources.inbox())]
    return pickPulls(pulls, query).map((pull): PullItem => ({ label: `#${pull.number}`, description: `${pull.title} · ${pull.repo}`, icon: 'pull-request', pull }))
  },
  accept: ({ pull }) => pullRecord(pull),
})
