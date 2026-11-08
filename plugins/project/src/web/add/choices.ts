import type { Kit } from '@sand/ui-kit/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { derive, div, dynamicChild, type Derive } from '@vaakx-dev/vrui'
import { keepNew, type AddForm, type Kind } from './form'
import { describe } from './pcs'
import type { Step } from './plan'

const titled = (kit: Kit, title: string, list: HTMLElement) => div({ class: 'flex flex-col gap-1' }, kit.sectionHeading(title), list)

export const pcChoice = (kit: Kit, form: AddForm) =>
  dynamicChild(form.pcs, pcs =>
    pcs.length > 1
      ? titled(
          kit,
          'PC',
          kit.choiceList(
            pcs.map(pc => ({ value: pc.id, label: pc.name, disabled: !pc.online, mark: kit.metaLine(describe(pc)) })),
            form.device,
            form.choose,
            'PC',
          ),
        )
      : null,
  )

const sourceList = (kit: Kit, form: AddForm, device: string) => {
  const draft = form.draftOf(device)
  return kit.choiceList<Kind>(
    [
      { value: 'folder', label: 'Existing folder', input: { value: draft.path, placeholder: 'Folder path' } },
      { value: 'empty', label: 'New empty project', input: { value: draft.name, placeholder: 'Project name' } },
    ],
    form.kind,
    kind => form.kind.set(kind),
    'What to add',
  )
}

export const sourceChoice = (kit: Kit, form: AddForm) => dynamicChild(form.device, device => (device ? sourceList(kit, form, device) : null))

const remoteTitle = (groups: ProjectGroup[]) => {
  const [only] = groups
  return `Same git remote as ${only && groups.length === 1 ? only.name : `${groups.length} projects`}`
}

const matchList = (kit: Kit, form: AddForm, { target, groups }: NonNullable<Step['matches']>) => {
  const title = remoteTitle(groups)
  const picked = () => {
    const match = form.match.get()
    return match?.target === target ? match.project : undefined
  }
  return titled(
    kit,
    title,
    kit.choiceList(
      [...groups.map(group => ({ value: group.id, label: `Add as a copy of ${group.name}` })), { value: keepNew, label: 'Keep it as a new project' }],
      picked,
      project => form.match.set({ target, project }),
      title,
    ),
  )
}

export const matchChoice = (kit: Kit, form: AddForm, step: Derive<Step>) =>
  dynamicChild(
    derive(() => step.get().matches?.target),
    () => {
      const { matches } = step.get()
      return matches ? matchList(kit, form, matches) : null
    },
  )
