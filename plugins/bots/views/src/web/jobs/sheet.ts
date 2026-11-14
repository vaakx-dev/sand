import { botName, type Job, jobTextLimit } from '@sand/bots/contract'
import { errorMessage } from '@sand/util'
import { div, show, sig } from '@vaakx-dev/vrui'
import type { Parts } from '../parts'

const TITLE_LIMIT = 60

const openJob = (parts: Parts, bot: string, job?: Job) => {
  const { kit } = parts.ctx
  const title = sig(job?.title ?? '')
  const goal = sig(job?.goal ?? '')
  const done = sig(job?.done ?? '')
  const saving = sig(false)
  const failure = sig('')
  const name = botName(parts.store.find(bot) ?? { name: '' })
  const fields = () => ({ title: title.get().trim(), goal: goal.get().trim(), done: done.get().trim() })
  const ready = () => Object.values(fields()).every(Boolean) && !saving.get()

  const store = () => (job ? parts.store.jobs.update(job.id, fields()) : parts.store.jobs.create(bot, fields()))

  const save = async (close: () => void) => {
    saving.set(true)
    failure.set('')
    try {
      await store()
      close()
    } catch (error) {
      failure.set(errorMessage(error))
    } finally {
      saving.set(false)
    }
  }

  parts.ctx.shell.sheet({
    label: job ? `Edit ${job.title}` : `New job for ${name}`,
    title: job ? 'Edit job' : 'New job',
    body: () =>
      div(
        { class: 'flex flex-col gap-4 pt-2' },
        kit.field({ label: 'Title' }, kit.textInput({ bindValue: title, maxLength: TITLE_LIMIT, placeholder: 'Morning CI triage', onMount: node => node.focus() })),
        kit.field({ label: 'Goal' }, kit.textArea({ bindValue: goal, rows: 2, maxLength: jobTextLimit, placeholder: 'Check failing CI on main every weekday morning.' })),
        kit.field(
          { label: 'Done right' },
          kit.textArea({ bindValue: done, rows: 2, maxLength: jobTextLimit, placeholder: 'Every red build has an owner or a fix PR.' }),
        ),
        job ? null : kit.secondaryText(`${name} runs it when you ask. Ask ${name} to run it on a schedule or when something changes.`),
        show(
          () => Boolean(failure.get()),
          () => kit.errorText(() => failure.get()),
        ),
      ),
    foot: close =>
      kit.primaryAction({ class: 'w-full', disabled: () => !ready(), onClick: () => void save(close) }, () => {
        if (saving.get()) return 'Saving…'
        return job ? 'Save' : 'Create job'
      }),
  })
}

export { openJob }
