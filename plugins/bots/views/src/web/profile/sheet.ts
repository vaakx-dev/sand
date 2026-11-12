import { memoryChangeWire, memoryLimit, memoryRead, memoryWrite } from '@sand/bot-memory/contract'
import { botName, type BotSummary } from '@sand/bots/contract'
import { homeRoute } from '@sand/ui-shell/contract'
import { derive, div, dynamicChild, list, p, show, sig, span } from '@vaakx-dev/vrui'
import { automationRow } from '../automations/row'
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
    if (name && name !== bot()?.name) void parts.store.update(id, { name }).catch(error => parts.ctx.report(error))
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
      : kit.plainButton({ title: 'Rename', class: 'min-w-0 rounded-sm', onClick: start }, kit.barTitle(() => nameOf(bot))),
  )
}

const jobBlock = (parts: Parts, id: string, bot: Bot) =>
  parts.ctx.kit.editable({
    title: 'Job',
    text: () => bot()?.job ?? '',
    view: () =>
      dynamicChild(
        derive(() => bot()?.job.trim() ?? ''),
        job => (job ? p({ class: 'whitespace-pre-wrap wrap-anywhere text-neutral-100' }, job) : p({}, `No job yet. Tell ${nameOf(bot)} in chat what it should take care of.`)),
      ),
    save: job => parts.store.update(id, { job }),
    rows: 8,
    maxLength: 20_000,
    placeholder: 'What it takes care of, and how',
  })

const projectsBlock = (parts: Parts, id: string, bot: Bot) => {
  const { kit } = parts.ctx
  const adding = sig(false)
  const fresh = { open: sig(false), name: sig('') }
  const creating = sig(false)
  const chosen = () => bot()?.projects ?? []
  const save = (projects: string[]) => void parts.store.update(id, { projects }).catch(error => parts.ctx.report(error))
  const create = () => {
    creating.set(true)
    createProject(parts, fresh.name.get())
      .then(project => {
        save([...chosen(), project])
        fresh.open.set(false)
        fresh.name.set('')
      })
      .catch(error => parts.ctx.report(error))
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
      () => kit.secondaryText('None. Without a project it works in chat and starts threads anywhere.'),
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

const automationsBlock = (parts: Parts, id: string, bot: Bot) => {
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
          () => kit.secondaryText(() => `Nothing yet. Ask ${nameOf(bot)} to check something on a schedule, or to watch a page or folder.`),
        ),
        menu.view(),
      ),
  )
}

const memoryBlock = (parts: Parts, id: string, bot: Bot) => {
  const { kit, markdown } = parts.ctx
  const text = sig('')
  void parts.ctx.wire.call(memoryRead, { bot: id }).then(
    found => text.set(found),
    error => parts.ctx.report(error),
  )
  const stop = parts.ctx.wire.on(memoryChangeWire, ([changed, found]) => {
    if (changed === id) text.set(found)
  })
  return div(
    { class: 'contents', onMount: () => stop },
    kit.editable({
      title: 'Memory',
      text: () => text.get(),
      view: () =>
        dynamicChild(
          derive(() => text.get().trim()),
          found => (found ? div({ class: 'flex flex-col gap-2' }, ...markdown.nodes(found)) : p({}, `Empty. ${nameOf(bot)} writes here as it learns.`)),
        ),
      save: memory => parts.ctx.wire.call(memoryWrite, { bot: id, text: memory }).then(() => text.set(memory)),
      rows: 10,
      maxLength: memoryLimit,
      placeholder: 'What it should remember',
    }),
  )
}

const foot = (parts: Parts, id: string, bot: Bot, close: () => void) => {
  const { kit } = parts.ctx
  const paused = () => bot()?.paused ?? false
  const pause = () => void parts.store.update(id, { paused: !paused() }).catch(error => parts.ctx.report(error))
  const remove = () => {
    close()
    parts.ctx.shell.open({ kind: homeRoute }, { replace: true })
    void parts.store.remove(id).catch(error => parts.ctx.report(error))
  }
  return div(
    { class: 'flex w-full items-center gap-2' },
    kit.secondaryAction({ size: 'sm', onClick: pause }, () => (paused() ? `Resume ${nameOf(bot)}` : `Pause ${nameOf(bot)}`)),
    span({ class: 'flex-1' }),
    kit.rowAction({ label: 'Delete bot', danger: true, run: remove }),
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
        jobBlock(parts, id, bot),
        projectsBlock(parts, id, bot),
        automationsBlock(parts, id, bot),
        memoryBlock(parts, id, bot),
        advancedBlock(parts, id, bot),
        list(parts.sections.items, section => section.id, section => section.get().render(id), div({ class: 'flex flex-col gap-6' })),
      ),
    foot: close => foot(parts, id, bot, close),
  })
}
