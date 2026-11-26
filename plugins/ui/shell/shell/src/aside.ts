import { derive, div, dynamicChild, list, listen, span, type Derive } from '@vaakx-dev/vrui'
import { bar } from './bar'
import type { Aside, SubjectProjects } from './contract'
import { PANEL_WIDTH } from './layout'
import type { Model } from './model'

type Surface = 'card' | 'panel'

export const asideToggles = (model: Model, asides: Derive<Aside[]>) => {
  const { icon, iconButton } = model.kit
  return list(
    asides,
    spec => spec.id,
    spec => {
      const shown = () => model.asideShown(spec.get())
      const button = iconButton(
        {
          title: () => spec.get().label,
          'aria-label': () => spec.get().label,
          active: shown,
          'aria-expanded': () => String(shown()),
          onClick: () => model.showAside(spec.get().id, !shown()),
        },
        icon(spec.get().icon),
      )
      if (spec.get().kind !== 'card') return button
      const anchor: HTMLElement = div({ class: 'relative flex' }, button, popover(model, () => anchor))
      return anchor
    },
    div({ class: 'flex shrink-0 items-center gap-1' }),
  )
}

const beside = (model: Model) => () => model.current.get()

const projectsOf = (model: Model) => model.subjectOf(model.current.get())?.projects

const projectsKey = (model: Model) => {
  const projects = projectsOf(model)
  return projects ? JSON.stringify([projects.list, projects.picked]) : ''
}

const projectPicker = ({ kit }: Model, { list, picked, pick }: SubjectProjects) => {
  const { cardItem, choiceItem, dropdown, projectIcon } = kit
  const position = list.findIndex(project => project.id === picked.id) + 1
  return dropdown({
    width: '100%',
    trigger: press =>
      cardItem(
        { ...press, 'aria-label': 'Project', lead: projectIcon(picked.name, picked.icon), end: `${position} of ${list.length}`, menu: true },
        picked.name,
      ),
    items: close =>
      list.map(project =>
        choiceItem(
          {
            selected: project.id === picked.id,
            onClick: () => {
              close()
              pick(project.id)
            },
          },
          projectIcon(project.name, project.icon),
          span({ class: 'flex-1 truncate' }, project.name),
        ),
      ),
  })
}

const placed = (model: Model, surface: Surface, picker: HTMLElement) => {
  switch (surface) {
    case 'card':
      return div({ class: 'flex shrink-0 flex-col' }, picker, model.kit.cardRule())
    case 'panel':
      return div({ class: 'flex shrink-0 flex-col px-1.5 pb-1' }, picker)
  }
}

const projectRow = (model: Model, surface: Surface) =>
  dynamicChild(
    derive(() => projectsKey(model)),
    key => {
      const projects = key ? projectsOf(model) : undefined
      return projects ? placed(model, surface, projectPicker(model, projects)) : null
    },
  )

const asideHead = (model: Model, spec: Aside, surface: Surface) => [
  bar(
    div({ class: 'flex min-w-0 flex-1 items-center gap-2' }, spec.head ? spec.head(beside(model)) : model.kit.sheetTitle(spec.label)),
    model.kit.closeButton({ title: `Close ${spec.label}`, onClick: () => model.showAside(spec.id, false) }),
  ),
  projectRow(model, surface),
]

const popover = (model: Model, anchor: () => HTMLElement) =>
  dynamicChild(model.openPop, spec => {
    if (!spec) return null
    listen(document, 'pointerdown', (event: PointerEvent) => {
      if (!anchor().contains(event.target as Node)) model.showAside(spec.id, false)
    })
    return div(
      {
        'aria-label': spec.label,
        class: [model.kit.layer.sticky, 'absolute top-full right-0 mt-1 flex flex-col overflow-auto rounded-2xl bg-neutral-800 p-1.5 shadow-xl'],
        style: () => ({ width: '18rem', maxHeight: `${Math.max(model.height.get() - 64, 160)}px` }),
      },
      projectRow(model, 'card'),
      spec.render(beside(model)),
    )
  })

export const asideCard = (model: Model) =>
  dynamicChild(model.openCard, spec =>
    spec
      ? div(
          { class: [model.kit.layer.sticky, 'pointer-events-none absolute inset-x-0 top-12 bottom-3 flex justify-end pr-3'] },
          div(
            { 'aria-label': spec.label, 'data-part': 'aside', class: 'pointer-events-auto flex max-h-full flex-col self-start rounded-2xl bg-neutral-800 p-1.5 shadow-xl', style: { width: '18rem' } },
            asideHead(model, spec, 'card'),
            spec.render(beside(model)),
          ),
        )
      : null,
  )

const docked = (model: Model, open: Model['openPanel'], look: { class: string; style?: Record<string, string> }) =>
  dynamicChild(open, spec =>
    spec
      ? div(
          { 'aria-label': spec.label, 'data-part': 'aside', class: ['flex min-h-0 min-w-0 shrink-0 flex-col bg-neutral-950', look.class], style: look.style ?? null },
          asideHead(model, spec, 'panel'),
          spec.render(beside(model)),
        )
      : null,
  )

export const asidePanel = (model: Model) => docked(model, model.openPanel, { class: '', style: { width: `${PANEL_WIDTH}px` } })

export const asideDrawer = (model: Model) => docked(model, model.openDrawer, { class: 'h-64' })

export const asideScreen = (model: Model, spec: Aside) =>
  div({ 'aria-label': spec.label, 'data-part': 'aside', class: 'flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-950' }, asideHead(model, spec, 'panel'), spec.render(beside(model)))
