import type { Kit } from '@sand/ui-kit/contract'
import type { Shell } from '@sand/ui-shell/contract'
import { collectScope, disposeAll, div, dynamicChild, effect, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'
import type { PalettePage } from '../contract'
import { paletteHead } from './head'
import { pageModel, type PageModel } from './model'
import type { PageMemory, PageNav } from './nav'
import { pageBody, pageKeys } from './page'

const pageNav = (stack: Sig<PalettePage[]>): PageNav => {
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
    fail: error => console.error(error),
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

const shownModel = (kit: Kit, stack: Sig<PalettePage[]>, query: () => string) => {
  const nav = pageNav(stack)
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
    const { value, scope } = collectScope(() => untrack(() => pageModel(kit, page, nav, initial)))
    model.set(value)
    return () => disposeAll(scope)
  })
  return model
}

export const searchSheet = (kit: Kit, shell: Shell, stack: Sig<PalettePage[]>, query: () => string) => {
  const model = shownModel(kit, stack, query)
  const shown = (render: (found: PageModel) => HTMLElement) => dynamicChild(model, found => (found ? render(found) : null))
  const closedByShell = () => () => {
    if (stack.get().length) stack.set([])
  }
  const open = stack.map(pages => pages.length > 0)
  effect(() => {
    if (!open.get()) return
    const handle = untrack(() =>
      shell.sheet({
        label: 'Search',
        head: () => shown(found => span({ class: 'flex min-w-0 flex-1', onKeyDown: pageKeys(found) }, paletteHead(kit, found))),
        body: () => div({ class: 'flex min-h-0 flex-col', onMount: closedByShell }, shown(found => pageBody(kit, found))),
      }),
    )
    return () => handle.close()
  })
}
