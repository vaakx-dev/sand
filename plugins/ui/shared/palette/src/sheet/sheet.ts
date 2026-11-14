import type { Kit } from '@sand/ui-kit/contract'
import type { SheetLook, Shell } from '@sand/ui-shell/contract'
import { collectScope, disposeAll, div, dynamicChild, effect, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'
import type { PalettePage } from '../contract'
import { formHead, paletteHead } from './head'
import { pageModel, type PageModel } from './model'
import type { PageMemory, PageNav } from './nav'
import { pageBody, pageKeys } from './page'
import type { Used } from './rank'

const pageNav = (stack: Sig<PalettePage[]>, fail: (error: unknown) => void): PageNav => {
  const held = new Set<PalettePage>()
  const memories = new WeakMap<PalettePage, PageMemory>()
  const top = () => stack.get().at(-1)
  const locked = () => {
    const page = top()
    return page !== undefined && held.has(page)
  }
  return {
    trail: () => stack.get(),
    push: page => stack.set([...stack.get(), page]),
    back(to = stack.get().length - 2) {
      if (to >= 0 && !locked()) stack.set(stack.get().slice(0, to + 1))
    },
    close(page) {
      if (!page || top() === page) stack.set([])
    },
    fail,
    isTop: page => top() === page,
    hold(page) {
      held.add(page)
      return () => void held.delete(page)
    },
    memory(page) {
      const memory = memories.get(page) ?? {}
      memories.set(page, memory)
      return memory
    },
  }
}

interface SheetParts {
  kit: Kit
  shell: Shell
  stack: Sig<PalettePage[]>
  query(): string
  used: Used
  fail(error: unknown): void
}

const shownModel = ({ kit, stack, query, used, fail }: SheetParts) => {
  const nav = pageNav(stack, fail)
  const model = sig<PageModel | undefined>(undefined)
  let opening = true
  effect(() => {
    const page = stack.get().at(-1)
    if (!page) {
      opening = true
      return model.set(undefined)
    }
    const initial = opening ? untrack(query) : ''
    opening = false
    const { value, scope } = collectScope(() => untrack(() => pageModel({ kit, page, nav, initial, used })))
    model.set(value)
    return () => disposeAll(scope)
  })
  return model
}

const lookOf = (page: PalettePage): SheetLook => {
  if (page.browse) return 'list'
  return page.field || page.review ? 'form' : 'search'
}

const scrolled = (look: SheetLook, model: PageModel, body: HTMLElement) =>
  look === 'form'
    ? body
    : div({ class: () => ['flex min-h-0 flex-col overflow-y-auto overscroll-contain px-2 pb-2', look === 'list' && model.searching.get() && 'h-screen sm:h-auto'] }, body)

const waitingLine = ({ metaLine }: Kit, model: PageModel) =>
  div({ class: 'flex h-8 shrink-0 items-center px-4', 'aria-live': 'polite' }, metaLine(() => model.late.waiting.get()))

const content = (kit: Kit, look: SheetLook, model: PageModel) => {
  const list = scrolled(look, model, pageBody(kit, model))
  return model.late.shown ? div({ class: 'flex min-h-0 flex-col' }, list, waitingLine(kit, model)) : list
}

export const searchSheet = (parts: SheetParts) => {
  const { kit, shell, stack } = parts
  const model = shownModel(parts)
  const shown = (render: (found: PageModel) => HTMLElement) => dynamicChild(model, found => (found ? render(found) : null))
  const closedByShell = () => () => {
    if (stack.get().length) stack.set([])
  }
  const first = stack.map(pages => pages[0])
  effect(() => {
    const page = first.get()
    if (!page) return
    const look = lookOf(page)
    const head = (found: PageModel) => (look === 'form' ? formHead(kit, found) : paletteHead(kit, found))
    const handle = untrack(() =>
      shell.sheet({
        label: page.title,
        look,
        head: () => shown(found => span({ class: look === 'form' ? 'flex min-w-0 flex-1' : 'flex shrink-0 flex-col', onKeyDown: pageKeys(found) }, head(found))),
        body: () => div({ class: 'flex min-h-0 flex-col', onMount: closedByShell }, shown(found => content(kit, look, found))),
      }),
    )
    return () => handle.close()
  })
}
