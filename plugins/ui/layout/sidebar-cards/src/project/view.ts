import { popupTrigger } from '@sand/kit/web'
import type { MenuSpec } from '@sand/protocol'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, list, show, span, type Sig } from '@vaakx-dev/vrui'
import type { ProjectChoice } from './choices'

export interface FilterParts {
  projects: Sig<ProjectChoice[]>
  project: Sig<string>
  label: Sig<string>
  filter(project: string | undefined): void
  choiceMenu(choice: ProjectChoice, done: () => void): MenuSpec
  chipMenu(): MenuSpec
}

export const filterButton = ({ icon, iconButton }: Kit, parts: FilterParts, open: Sig<boolean>) =>
  iconButton(
    {
      title: () => (parts.project.get() ? `Showing ${parts.label.get()}` : 'Filter by project'),
      'aria-label': 'Filter by project',
      active: () => open.get() || Boolean(parts.project.get()),
      ...popupTrigger(open),
      onClick: open.toggle(),
    },
    icon('folder'),
  )

const choiceRow = ({ choiceItem, projectIcon }: Kit, choice: Sig<ProjectChoice>, parts: FilterParts, context: ContextMenu, choose: (project: string) => void, close: () => void) =>
  choiceItem(
    {
      selected: () => parts.project.get() === choice.get().key,
      ...context.target(
        () => parts.choiceMenu(choice.get(), close),
        () => choose(choice.get().key),
      ),
    },
    dynamicChild(choice, value => projectIcon(value.name, value.icon)),
    span({ class: 'min-w-0 flex-1 truncate' }, choice.map(value => value.name)),
    show(
      () => choice.get().count > 0,
      () => span({ class: 'shrink-0 text-xs tabular-nums text-neutral-500' }, choice.map(value => String(value.count))),
    ),
  )

export const filterMenu = (kit: Kit, parts: FilterParts, open: Sig<boolean>, context: ContextMenu) => {
  const { choiceItem, popover } = kit
  const close = () => open.set(false)
  const choose = (project: string | undefined) => {
    parts.filter(project)
    close()
  }
  return show(open, () =>
    popover(
      close,
      { class: 'top-full left-2 right-2 max-h-80 overflow-auto' },
      choiceItem({ selected: () => !parts.project.get(), onClick: () => choose(undefined) }, span({ class: 'min-w-0 flex-1 truncate' }, 'All projects')),
      list(
        parts.projects,
        choice => choice.key,
        choice => choiceRow(kit, choice, parts, context, choose, close),
        div({ class: 'flex flex-col' }),
      ),
    ),
  )
}

export const filterChip = ({ closeButton, projectIcon }: Kit, parts: FilterParts, context: ContextMenu) =>
  show(parts.project.map(Boolean), () =>
    div(
      {
        class: 'relative mx-2 mb-1 flex h-8 items-center gap-2 rounded-lg bg-neutral-900 pr-1 pl-3 text-xs text-neutral-300',
        ...context.target(() => parts.chipMenu()),
      },
      dynamicChild(parts.label, name => projectIcon(name, parts.projects.get().find(choice => choice.key === parts.project.get())?.icon)),
      span({ class: 'min-w-0 flex-1 truncate' }, parts.label),
      closeButton({ size: 'sm', title: 'Show all projects', onClick: () => parts.filter(undefined) }),
    ),
  )
