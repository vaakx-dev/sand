import { botName, type BotSummary } from '@sand/bots/contract'
import { derive, div, dynamicChild, list, show, sig, span } from '@vaakx-dev/vrui'
import { noAutomations } from '../automations/empty'
import { automationRow } from '../automations/row'
import { deleteAction } from '../delete'
import { automationsOf, projectName, projectNames, type Parts } from '../parts'
import { advancedBlock } from './advanced'
import { createProject, projectChecklist } from './projects'

type Bot = () => BotSummary | undefined

const nameOf = (bot: Bot) => botName(bot() ?? { name: '' })

const nameField = (parts: Parts, id: string, bot: Bot) => {
  const { kit } = parts.ctx
  const editing = sig(false)
  const draft = sig('')
  const save = () => {
    const name = draft.get().trim()
    editing.set(false)
    if (name && name !== bot()?.name) void parts.toasts.attempt('Couldn’t rename the bot', () => parts.store.update(id, { name }))
  }
  const start = () => {
    draft.set(bot()?.name ?? '')
    editing.set(true)
  }
  return dynamicChild(editing, open =>
    open
      ? kit.textInput({
          bindValue: draft,
          maxLength: 60,
          'aria-label': 'Name',
          class: 'max-w-48',
          onMount: node => node.select(),
          onBlur: save,
          onKeyDown: event => {
            if (event.key === 'Enter') save()
            if (event.key === 'Escape') editing.set(false)
          },
        })
      : kit.plainButton({ title: 'Rename', class: 'min-w-0 rounded-sm', onClick: start }, kit.sheetTitle(() => nameOf(bot))),
  )
}

const projectsBlock = (parts: Parts, id: string, bot: Bot) => {
  const { kit } = parts.ctx
  const adding = sig(false)
  const fresh = { open: sig(false), name: sig('') }
  const creating = sig(false)
  const chosen = () => bot()?.projects ?? []
  const save = (projects: string[]) => void parts.toasts.attempt('Couldn’t change the bot’s projects', () => parts.store.update(id, { projects }))
  const create = () => {
    creating.set(true)
    createProject(parts, fresh.name.get())
      .then(project => {
        save([...chosen(), project])
        fresh.open.set(false)
        fresh.name.set('')
      })
      .catch(error => parts.toasts.error('Couldn’t create the project', error))
      .finally(() => creating.set(false))
  }
  const row = (project: string) =>
    div(
      { class: 'flex min-h-8 items-center gap-2 text-sm' },
      span({ class: 'min-w-0 flex-1 truncate text-neutral-100' }, () => projectName(parts, project)),
      kit.iconButton({ size: 'sm', title: 'Remove', 'aria-label': `Remove ${projectName(parts, project)}`, onClick: () => save(chosen().filter(other => other !== project)) }, kit.icon('x', 'sm')),
    )
  return kit.pageSection(
    { title: 'Projects', action: kit.linkButton({ class: 'text-sm', onClick: () => adding.update(open => !open) }, () => (adding.get() ? 'Done' : 'Add')) },
    list(derive(chosen), project => project, project => row(project.get()), div({ class: 'flex flex-col' })),
    show(
      () => !chosen().length && !adding.get(),
      () => kit.emptyState({ text: 'No projects.' }),
    ),
    show(
      () => adding.get(),
      () =>
        div(
          { class: 'flex flex-col gap-2' },
          projectChecklist(parts, {
            chosen,
            toggle: project => save([...chosen(), project]),
            fresh,
            only: group => !chosen().includes(group.id),
          }),
          show(
            () => fresh.open.get(),
            () =>
              div(
                { class: 'flex justify-end' },
                kit.primaryAction({ size: 'sm', disabled: () => creating.get() || !fresh.name.get().trim(), onClick: create }, 'Create project'),
              ),
          ),
        ),
    ),
  )
}

const automationsBlock = (parts: Parts, id: string) => {
  const { kit } = parts.ctx
  const menu = kit.contextMenu()
  const items = derive(() => automationsOf(parts, id))
  return show(
    () => parts.automationSources.items.get().length > 0,
    () =>
      kit.pageSection(
        { title: 'Automations' },
        list(items, item => item.id, item => automationRow(kit, menu, item, 'raised'), div({ class: '-mx-2 flex flex-col' })),
        show(
          () => !items.get().length,
          () => noAutomations(kit),
        ),
        menu.view(),
      ),
  )
}

const foot = (parts: Parts, id: string, bot: Bot, close: () => void) => {
  const { kit } = parts.ctx
  const paused = () => bot()?.paused ?? false
  const pause = () => void parts.toasts.attempt(`Couldn’t ${paused() ? 'resume' : 'pause'} ${nameOf(bot)}`, () => parts.store.update(id, { paused: !paused() }))
  const remove = deleteAction(parts, id, nameOf(bot))
  return div(
    { class: 'flex w-full items-center gap-2' },
    kit.secondaryAction({ size: 'sm', onClick: pause }, () => (paused() ? `Resume ${nameOf(bot)}` : `Pause ${nameOf(bot)}`)),
    span({ class: 'flex-1' }),
    kit.confirmButton({
      action: {
        ...remove,
        label: 'Delete bot',
        run: async () => {
          await remove.run()
          close()
        },
      },
    }),
  )
}

export const openProfile = (parts: Parts, id: string) => {
  const { kit } = parts.ctx
  const bot = () => parts.store.find(id)
  parts.ctx.shell.sheet({
    label: `${nameOf(bot)} profile`,
    head: () =>
      div(
        { class: 'flex min-w-0 flex-1 items-center gap-3' },
        nameField(parts, id, bot),
        kit.metaLine(() => projectNames(parts, bot()?.projects ?? [])),
      ),
    body: () =>
      div(
        { class: 'flex flex-col gap-6 pt-2' },
        projectsBlock(parts, id, bot),
        automationsBlock(parts, id),
        advancedBlock(parts, id, bot),
        list(parts.sections.items, section => section.id, section => section.get().render(id), div({ class: 'flex flex-col gap-6' })),
      ),
    foot: close => foot(parts, id, bot, close),
  })
}
