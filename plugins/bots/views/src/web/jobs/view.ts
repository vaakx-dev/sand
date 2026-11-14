import { botName, byStatus } from '@sand/bots/contract'
import { derive, div, dynamicChild, list, show } from '@vaakx-dev/vrui'
import { automationRow } from './automation'
import { automationsOf } from '../parts'
import { jobCard } from './card'
import { morningSection, morningToday } from './morning'
import type { JobsParts } from './parts'
import { openJob } from './sheet'

const jobsView = (jobs: JobsParts) => {
  const { parts, bot } = jobs
  const { kit } = parts.ctx
  const menu = kit.contextMenu()
  const found = () => parts.store.find(bot)
  const name = () => botName(found() ?? { name: '' })
  const sorted = derive(() => (found()?.jobs ?? []).toSorted(byStatus))
  const loose = derive(() => automationsOf(parts, bot).filter(item => !item.job))
  const reveal = (job: string) => parts.showJob(bot, job)

  return kit.pageBody(
    {},
    div(
      { class: 'flex min-w-0 flex-col gap-10' },
      dynamicChild(
        () => morningToday(found()?.morning),
        morning => (morning ? morningSection(kit, morning, reveal) : null),
      ),
      kit.pageSection(
        { title: 'Jobs', action: kit.secondaryAction({ size: 'sm', onClick: () => openJob(parts, bot) }, 'New job') },
        list(sorted, job => job.id, job => dynamicChild(job, value => jobCard(jobs, menu, value)), div({ class: 'flex flex-col gap-3' })),
        show(
          () => !sorted.get().length,
          () => kit.emptyState({ text: () => `No jobs yet. Add one, or tell ${name()} what to take care of.` }),
        ),
      ),
      show(
        () => loose.get().length > 0,
        () =>
          kit.pageSection(
            { title: 'Not part of a job' },
            list(loose, item => item.id, item => automationRow(kit, menu, item, 'page'), div({ class: '-mx-2 flex flex-col' })),
          ),
      ),
    ),
    menu.view(),
  )
}

export { jobsView }
