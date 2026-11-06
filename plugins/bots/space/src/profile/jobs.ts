import { botJobs, type BotSummary, type JobVersion } from '@sand/bots/contract'
import { oneLine } from '@sand/util'
import { derive, effect, resource, show, untrack, type Sig } from '@vaakx-dev/vrui'
import type { BotsContext } from '../context'

const when = (at: number) => new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export const jobsSection = (ctx: BotsContext, bot: () => BotSummary, restore: (job: string) => void) => {
  const { quietButton, rowList, settingsRow, settingsSection } = ctx.kit
  const versions = resource(() => ctx.wire.call(botJobs, { bot: bot().id }), { lazy: true })
  const job = derive(() => bot().job)
  effect(() => {
    job.get()
    untrack(versions.refetch)
  })
  const shown = derive(() => versions.data.get() ?? [])
  const row = (version: Sig<JobVersion>) =>
    settingsRow(
      { title: () => oneLine(version.get().job), detail: () => `Replaced ${when(version.get().replaced)}`, class: 'min-w-0' },
      quietButton({ size: 'sm', onClick: () => restore(version.get().job) }, 'Restore'),
    )
  return show(
    () => shown.get().length > 0,
    () => settingsSection({ title: 'Earlier versions' }, rowList(shown, version => version.replaced, row)),
  )
}
