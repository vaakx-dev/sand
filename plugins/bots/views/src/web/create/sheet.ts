import { errorMessage } from '@sand/util'
import { div, show, sig } from '@vaakx-dev/vrui'
import type { Parts } from '../parts'
import { createProject, projectChecklist } from '../profile/projects'

export const openNewBot = (parts: Parts) => {
  const { kit } = parts.ctx
  const job = sig('')
  const name = sig('')
  const chosen = sig<string[]>([])
  const fresh = { open: sig(false), name: sig('') }
  const creating = sig(false)
  const failure = sig('')
  const ready = () => Boolean(job.get().trim()) && !(fresh.open.get() && !fresh.name.get().trim()) && !creating.get()
  const toggle = (project: string) => chosen.update(list => (list.includes(project) ? list.filter(other => other !== project) : [...list, project]))

  const create = async (close: () => void) => {
    creating.set(true)
    failure.set('')
    try {
      const made = fresh.open.get() ? [await createProject(parts, fresh.name.get())] : []
      const bot = await parts.store.create({ job: job.get().trim(), projects: [...chosen.get(), ...made], ...(name.get().trim() && { name: name.get().trim() }) })
      close()
      parts.open(bot.id)
    } catch (error) {
      failure.set(errorMessage(error))
    } finally {
      creating.set(false)
    }
  }

  parts.ctx.shell.sheet({
    label: 'New bot',
    title: 'New bot',
    body: () =>
      div(
        { class: 'flex flex-col gap-4 pt-2' },
        kit.field(
          { label: 'What should it take care of?' },
          kit.textArea({ bindValue: job, rows: 3, maxLength: 20_000, placeholder: 'Keep the CLI’s tests green and answer new issues.', onMount: node => node.focus() }),
        ),
        kit.field({ label: 'Projects' }, div({ class: '-mx-2' }, projectChecklist(parts, { chosen: () => chosen.get(), toggle, fresh }))),
        kit.field({ label: 'Name' }, kit.textInput({ bindValue: name, maxLength: 60, placeholder: 'Optional; it picks one if you leave this empty' })),
        show(
          () => Boolean(failure.get()),
          () => kit.errorText(() => failure.get()),
        ),
      ),
    foot: close => kit.primaryAction({ class: 'w-full', disabled: () => !ready(), onClick: () => void create(close) }, () => (creating.get() ? 'Creating…' : 'Create bot')),
  })
}
