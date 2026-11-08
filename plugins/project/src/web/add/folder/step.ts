import type { PcView } from '@sand/devices-contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { derive, div, dynamicChild, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../../context'
import type { Pulse } from '@sand/reactive'
import type { Step } from '../run'
import { folderForm } from './form'
import { matchChoice } from './matches'
import { plan } from './plan'
import { folderList } from './rows'

const elsewhere = (ctx: ProjectsContext, device: string) =>
  ctx.projects.groups().filter(group => !group.locations.some(entry => entry.device === device) && group.locations.some(entry => !entry.missing))

const otherProjects = (ctx: ProjectsContext, groups: Derive<ProjectGroup[]>, bring: (project: string) => void) => {
  const { listRow, projectMark, rowList, sectionHeading } = ctx.kit
  const row = (group: Sig<ProjectGroup>) =>
    listRow({
      surface: 'raised',
      touch: true,
      lead: () => projectMark(group.get().name, ctx.projects.groupIcon(group.get())),
      title: () => group.get().name,
      onClick: () => bring(group.get().id),
    })
  return dynamicChild(
    derive(() => groups.get().length > 0),
    shown => (shown ? div({ class: 'flex flex-col gap-1' }, sectionHeading('On your other PCs'), rowList(groups, group => group.id, row)) : null),
  )
}

export const folderStep = (ctx: ProjectsContext, changes: Pulse, pc: PcView, bring: (project: string) => void): Step => {
  const { errorText, sheetText, textInput } = ctx.kit
  const form = folderForm(ctx, pc)
  const start = form.path.get()
  const others = changes.read(() => (form.path.get() === start ? elsewhere(ctx, pc.id) : []))
  const step = changes.read(() => plan(ctx, form))
  const note = dynamicChild(step, ({ note: text, error }) => {
    if (!text) return null
    return error ? errorText(text) : sheetText(text)
  })
  const field = textInput({
    bindValue: form.path,
    class: 'font-mono',
    'aria-label': `Folder on ${pc.name}`,
    placeholder: 'Folder path',
    spellcheck: false,
    autocomplete: 'off',
    onMount: node => node.focus(),
  })
  return {
    body: div(
      { class: 'flex flex-col gap-4' },
      div({ class: 'flex flex-col gap-2' }, field, note),
      matchChoice(ctx, form, step),
      otherProjects(ctx, others, bring),
      folderList(ctx, changes, form, () => others.get().length > 0),
    ),
    action: derive(() => ({ ...step.get(), busy: 'Adding…' })),
  }
}
