import type { ContextMenu, MenuSpec } from '@sand/dom'
import { div, dynamicChild, icon, iconButton, list, popover, popoverItem, popupTrigger, projectIcon, show, span, type Sig } from '@sand/dom'
import type { ProjectChoice } from './choices'

export interface FilterParts {
  projects: Sig<ProjectChoice[]>
  project: Sig<string>
  label: Sig<string>
  filter(project: string | undefined): void
  choiceMenu(choice: ProjectChoice, done: () => void): MenuSpec
  chipMenu(): MenuSpec
}

export const filterButton = (parts: FilterParts, open: Sig<boolean>) =>
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

const choiceRow = (choice: Sig<ProjectChoice>, parts: FilterParts, context: ContextMenu, choose: (project: string) => void, close: () => void) =>
  popoverItem(
    {
      active: () => parts.project.get() === choice.get().key,
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

export const filterMenu = (parts: FilterParts, open: Sig<boolean>, context: ContextMenu) => {
  const close = () => open.set(false)
  const choose = (project: string | undefined) => {
    parts.filter(project)
    close()
  }
  return show(open, () =>
    popover(
      close,
      { class: 'top-full left-2 right-2 max-h-80 overflow-auto' },
      popoverItem({ active: () => !parts.project.get(), onClick: () => choose(undefined) }, 'All projects'),
      list(
        parts.projects,
        choice => choice.key,
        choice => choiceRow(choice, parts, context, choose, close),
        div({ class: 'flex flex-col' }),
      ),
    ),
  )
}

export const filterChip = (parts: FilterParts, context: ContextMenu) =>
  show(parts.project.map(Boolean), () =>
    div(
      {
        class: 'relative mx-2 mb-1 flex h-8 items-center gap-2 rounded-lg bg-neutral-900 pr-1 pl-3 text-xs text-neutral-300',
        ...context.target(() => parts.chipMenu()),
      },
      dynamicChild(parts.label, name => projectIcon(name, parts.projects.get().find(choice => choice.key === parts.project.get())?.icon)),
      span({ class: 'min-w-0 flex-1 truncate' }, parts.label),
      iconButton({ size: 'sm', title: 'Show all projects', onClick: () => parts.filter(undefined) }, icon('x', 14)),
    ),
  )
