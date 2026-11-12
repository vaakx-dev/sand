import type { Entry } from '@sand/logbook/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { derive, div, dynamicChild, list, show, sig, span } from '@vaakx-dev/vrui'
import { entryView, type EntryParts, type Focus } from './entry'
import { search as searchOf, type Search } from './search'
import { sections } from './sections'

interface ViewParts extends Omit<EntryParts, 'focus' | 'projectOf' | 'pickTag'> {
  version(): number
  home(): string | undefined
  projects(): ProjectGroup[]
  projectName(id: string): string | undefined
}

interface Choice {
  project?: string
}

type State = 'failed' | 'loading' | 'empty' | 'listed'

const ALL_PROJECTS = 'All projects'

const projectMenu = (parts: ViewParts, project: () => string | undefined, pick: (choice: Choice) => void) => {
  const { kit } = parts
  const label = () => {
    const id = project()
    return id ? (parts.projectName(id) ?? 'Project') : ALL_PROJECTS
  }
  const item = (close: () => void, choice: Choice, name: string) =>
    kit.choiceItem(
      {
        selected: () => project() === choice.project,
        onClick: () => {
          close()
          pick(choice)
        },
      },
      span({ class: 'flex-1 truncate' }, name),
    )
  return kit.dropdown({
    placement: 'below-right',
    class: 'max-w-40 shrink-0',
    trigger: press => kit.pickerButton({ ...press, 'aria-label': 'Project' }, label),
    items: close => [item(close, {}, ALL_PROJECTS), ...parts.projects().map(group => item(close, { project: group.id }, group.name))],
  })
}

const tagLine = (parts: ViewParts, search: Search) =>
  show(
    () => search.tag.get() !== undefined,
    () =>
      div(
        { class: 'flex min-w-0 items-center gap-1 px-2 text-sm text-neutral-400' },
        span({ class: 'min-w-0 truncate' }, () => `Tagged ${search.tag.get()}`),
        parts.kit.closeButton({ size: 'sm', title: 'Show all tags', onClick: () => search.tag.set(undefined) }),
      ),
  )

const entryList = (parts: ViewParts, search: Search, entryParts: EntryParts) => {
  const shown = derive(() => sections(search.entries.get() ?? []))
  return div(
    { class: 'flex min-w-0 flex-col' },
    list(
      shown,
      section => section.label,
      section =>
        div(
          parts.kit.sectionHeading(() => section.get().label),
          list(
            derive(() => section.get().entries),
            entry => entry.id,
            entry => entryView(entryParts, entry),
            div({ class: 'flex min-w-0 flex-col' }),
          ),
        ),
    ),
    show(search.more, () => div({ class: 'px-2 pt-3' }, parts.kit.secondaryAction({ size: 'sm', onClick: search.showMore }, 'Show more'))),
  )
}

const logbookView = (parts: ViewParts) => {
  const { kit } = parts
  const picked = sig<Choice | undefined>(undefined)
  const project = () => {
    const choice = picked.get()
    return choice ? choice.project : parts.home()
  }
  const search = searchOf({ wire: parts.wire, version: parts.version, project })
  const focus = sig<Focus | undefined>(undefined)
  const entryParts: EntryParts = {
    ...parts,
    focus,
    projectOf: (entry: Entry) => (project() === undefined && entry.project ? parts.projectName(entry.project) : undefined),
    pickTag: tag => search.tag.set(tag),
  }
  const emptyText = () => {
    if (search.filtered()) return 'Nothing matches.'
    const id = project()
    return id ? `Nothing logged for ${parts.projectName(id) ?? 'this project'} yet.` : 'Nothing logged yet.'
  }
  const state = derive((): State => {
    if (search.failure.get()) return 'failed'
    const entries = search.entries.get()
    if (!entries) return 'loading'
    return entries.length ? 'listed' : 'empty'
  })
  const body = (shown: State) => {
    switch (shown) {
      case 'failed':
        return kit.errorState({ text: () => search.failure.get(), retry: search.reload })
      case 'loading':
        return kit.loadingState()
      case 'empty':
        return div({ class: 'px-2' }, kit.emptyState({ text: emptyText }))
      case 'listed':
        return entryList(parts, search, entryParts)
    }
  }
  return div(
    { class: 'flex min-w-0 flex-col gap-2 p-3' },
    div(
      { class: 'flex min-w-0 items-center gap-2' },
      kit.searchField({ placeholder: 'Search the Logbook', 'aria-label': 'Search the Logbook', bindValue: search.query }),
      projectMenu(parts, project, choice => picked.set(choice)),
    ),
    tagLine(parts, search),
    dynamicChild(state, body),
  )
}

export { logbookView, type ViewParts }
