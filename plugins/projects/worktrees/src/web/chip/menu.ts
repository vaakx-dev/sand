import type { WorktreeEntry, WorktreeState } from '../../contract'
import { div, groupLabel, icon, menuItem, menuSeparator, okMark, span, tildeHome, type Child, type ContextMenu, type IconName, type MenuSpec } from '@sand/dom'
import { uuid } from '@sand/kit'
import type { WebContext } from '../client'
import type { Choice, Choices } from './choices'
import type { ChipTarget } from './target'

interface Row {
  glyph: IconName
  title: string
  line?: string
  selected: boolean
  choose(): void
  end?: Child
  menu?: () => MenuSpec
}

export interface EntryMenus {
  context: ContextMenu
  spec(entry: WorktreeEntry, use: () => void): MenuSpec
}

const row = ({ glyph, title, line, selected, choose, end, menu }: Row, context?: ContextMenu) =>
  menuItem(
    {
      role: 'menuitemradio',
      'aria-checked': String(selected),
      active: selected,
      class: 'py-2 hover:bg-neutral-700',
      ...(menu && context ? context.target(menu, choose) : { onClick: choose }),
    },
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon(glyph, 16)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'truncate font-medium' }, title),
      line ? span({ class: 'truncate text-xs text-neutral-500', title: line }, line) : null,
    ),
    end ?? (selected ? okMark() : null),
  )

const changes = (entry: WorktreeEntry) => (entry.changed ? span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums' }, `●${entry.changed}`) : undefined)

const currentPath = (state: WorktreeState, choice: Choice) => {
  if (state.worktree) return state.root
  return choice.mode === 'existing' ? choice.path : ''
}

const existingRows = (state: WorktreeState, choice: Choice, pick: (choice: Choice) => void, menus: EntryMenus) => {
  const others = state.worktrees.filter(entry => !entry.main)
  if (!others.length) return []
  const current = currentPath(state, choice)
  return [
    menuSeparator(),
    groupLabel('Existing worktrees'),
    ...others.map(entry => {
      const use = () => pick({ mode: 'existing', path: entry.path, branch: entry.branch })
      return row(
        {
          glyph: 'branch',
          title: entry.branch ?? tildeHome(entry.path),
          line: tildeHome(entry.path),
          selected: entry.path === current,
          choose: use,
          end: changes(entry),
          menu: () => menus.spec(entry, use),
        },
        menus.context,
      )
    }),
  ]
}

const choose = async (ctx: WebContext, choices: Choices, { state, draft }: ChipTarget, next: Choice) => {
  if (!state || !draft) return
  if (state.worktree && next.mode !== 'existing') {
    const id = uuid()
    choices.choose(id, next)
    await ctx.threads.draft(state.main, draft.device, id)
  } else choices.choose(draft.id, next)
  ctx.composer?.focus()
}

export const draftMenu = (ctx: WebContext, choices: Choices, target: ChipTarget, close: () => void, menus: EntryMenus) => {
  const { state, choice } = target
  if (!state) return null
  const pick = (next: Choice) => {
    close()
    void choose(ctx, choices, target, next)
  }
  const base = state.worktrees.find(entry => entry.main)?.branch ?? state.branch
  const from = (state.worktree ? base : (state.branch ?? base)) ?? undefined
  const mode = state.worktree ? undefined : choice.mode
  return div(
    { class: 'flex flex-col gap-1 p-1' },
    row({ glyph: 'folder', title: 'Local', line: `${tildeHome(state.main)}${base ? ` on ${base}` : ''}`, selected: mode === 'local', choose: () => pick({ mode: 'local' }) }),
    row({
      glyph: 'folder-git',
      title: 'New worktree',
      line: `its own folder and branch, from ${from ?? 'HEAD'}`,
      selected: mode === 'new',
      choose: () => pick({ mode: 'new', base: from }),
    }),
    ...existingRows(state, choice, pick, menus),
  )
}
