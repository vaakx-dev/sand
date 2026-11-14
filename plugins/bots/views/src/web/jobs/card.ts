import { botName, type BotAutomation, type Job, type JobAsk } from '@sand/bots/contract'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import { div, dynamicChild, p, span } from '@vaakx-dev/vrui'
import { automationsOf } from '../parts'
import type { JobsParts } from './parts'
import { type RunRow, runRows } from './runs'
import { openJob } from './sheet'
import { prose, statusTag } from './status'

const RUNS_SHOWN = 4

const TONES: Record<RunRow['tone'], string> = { plain: 'text-neutral-200', needs: 'text-neutral-100', quiet: 'text-neutral-500' }

const askBlock = (kit: Kit, { answer, reveal }: JobsParts, ask: JobAsk) =>
  div(
    { class: 'flex min-w-0 flex-col gap-2 rounded-md bg-warning-950/60 px-3 py-3' },
    p({ class: 'text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere text-neutral-100' }, ask.question),
    div(
      { class: '-ml-2 flex items-center gap-2' },
      kit.quietButton({ size: 'sm', strong: true, onClick: () => answer(ask) }, 'Answer'),
      kit.quietButton({ size: 'sm', onClick: () => reveal(ask.entry) }, 'Open the run'),
    ),
  )

const brief = ({ goal, done }: Job) =>
  div(
    { class: 'flex min-w-0 flex-col gap-1' },
    prose('text-neutral-200', goal),
    prose('text-neutral-400', span({ class: 'text-neutral-500' }, 'Done right: '), done),
  )

const cue = (kit: Kit, { icon, title, when, paused }: BotAutomation) =>
  span({ class: 'flex min-w-0 items-center gap-1.5' }, kit.icon(icon, 'sm'), `${title} · ${paused ? 'Paused' : when}`)

const whenLine = (kit: Kit, cues: BotAutomation[], name: string) =>
  cues.length
    ? div({ class: 'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500' }, ...cues.map(item => cue(kit, item)))
    : p({ class: 'text-xs text-neutral-500' }, `Runs only when you ask. Ask ${name} to run it on a schedule or when something changes.`)

const runRow = ({ at, text, tone }: RunRow) =>
  div(
    { class: 'flex min-w-0 flex-col gap-1 py-1.5 sm:flex-row sm:items-baseline sm:gap-4' },
    span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums sm:w-24' }, at),
    prose(TONES[tone], text),
  )

const runsBlock = (kit: Kit, { runs }: Job) =>
  runs.length ? kit.field({ label: 'Recent runs' }, div({ class: 'flex min-w-0 flex-col' }, ...runRows(runs).slice(0, RUNS_SHOWN).map(runRow))) : null

const menuOf = ({ parts, bot }: JobsParts, job: Job): MenuAction[] => {
  const { store, toasts } = parts
  const pausing = job.paused ? 'resume' : 'pause'
  return [
    { id: 'edit', label: 'Edit', icon: 'pencil', run: () => openJob(parts, bot, job) },
    { id: 'pause', label: job.paused ? 'Resume' : 'Pause', run: () => toasts.attempt(`Couldn’t ${pausing} ${job.title}`, () => store.jobs.update(job.id, { paused: !job.paused })) },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'trash',
      danger: true,
      confirm: 'Delete this job, with the schedules and watches that run it?',
      run: () => toasts.attempt(`Couldn’t delete ${job.title}`, () => store.jobs.remove(job.id)),
    },
  ]
}

const head = (kit: Kit, menu: ContextMenu, jobs: JobsParts, job: Job) => {
  const spec = () => ({ title: job.title, actions: menuOf(jobs, job) })
  return div(
    { class: 'flex min-w-0 items-center gap-3' },
    span({ class: ['min-w-0 flex-1 truncate text-base font-semibold', job.status === 'paused' ? 'text-neutral-400' : 'text-neutral-100'] }, job.title),
    statusTag(kit, job.status),
    span(
      { class: '-mr-2' },
      kit.iconButton({ size: 'sm', title: 'More', 'aria-haspopup': 'menu', ...menu.target(spec, event => menu.openBelow(event, spec)) }, kit.icon('more', 'sm')),
    ),
  )
}

const jobCard = (jobs: JobsParts, menu: ContextMenu, job: Job) => {
  const { parts, bot } = jobs
  const { kit } = parts.ctx
  const cues = () => automationsOf(parts, bot).filter(item => item.job === job.id)
  const name = botName(parts.store.find(bot) ?? { name: '' })
  return div(
    { class: 'flex min-w-0 flex-col gap-4 rounded-lg bg-neutral-800/60 px-4 pt-3 pb-4', 'data-job': job.id },
    head(kit, menu, jobs, job),
    job.ask ? askBlock(kit, jobs, job.ask) : null,
    brief(job),
    dynamicChild(cues, found => whenLine(kit, found, name)),
    runsBlock(kit, job),
  )
}

export { jobCard }
