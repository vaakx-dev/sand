import type { PaletteItem, PaletteItemAction, PalettePage } from '../contract'
import { batch, derive, effect, errorMessage, listbox, onTimeout, sig, untrack } from '@sand/dom'
import { actionsPage } from './actions'
import { entries, loadItems } from './load'
import type { PageMemory, PageNav } from './nav'

export type PageModel = ReturnType<typeof pageModel>

type Run = () => void | Promise<void>

const draftOf = (page: PalettePage, memory: PageMemory, initial: string) => {
  memory.text ??= sig(page.field?.value ?? initial)
  return memory.text
}

const emptyText = (page: PalettePage, query: string) => {
  if (typeof page.empty === 'function') return page.empty(query)
  if (page.empty !== undefined) return page.empty
  return page.field || page.review ? '' : 'No matches'
}

export const pageModel = (page: PalettePage, nav: PageNav, initial = '') => {
  const field = page.field
  const memory = nav.memory(page)
  const text = draftOf(page, memory, initial)
  let restored = memory.selected
  const results = sig<PaletteItem[]>([])
  const loads = sig(0)
  const reloads = sig(0)
  const fills = sig(0)
  const busy = sig(false)
  const failure = sig('')
  const progress = sig('')

  const reload = () => reloads.update(count => count + 1)

  const advance = (next: PalettePage) => {
    memory.selected = box.selected.get()
    nav.push(next)
  }

  const closeAndRun = (run: Run) => {
    nav.close(page)
    return Promise.resolve().then(run).catch(nav.fail)
  }

  const runThenBack = (run: Run) => {
    const to = nav.trail().indexOf(page) - 1
    void Promise.resolve()
      .then(run)
      .then(() => {
        if (!nav.isTop(page)) return
        if (to >= 0) nav.back(to)
        else reload()
      }, nav.fail)
  }

  const fill = (value: string) => {
    text.set(value)
    fills.update(count => count + 1)
  }

  const choose = (item: PaletteItem | undefined) => {
    if (!item || item.disabled) return
    if (item.page) return advance(item.page())
    if (item.fill !== undefined) return fill(item.fill)
    if (item.returnAfter) return runThenBack(() => item.run?.())
    void closeAndRun(() => item.run?.())
  }

  const box = listbox({ count: () => results.get().length, choose: index => choose(results.get()[index]), start: field ? -1 : 0, wrap: true })

  const present = (items: PaletteItem[]) =>
    batch(() => {
      results.set(items)
      const index = restored ?? (field ? -1 : 0)
      restored = undefined
      if (index < 0) box.clear()
      else box.select(index)
      loads.update(count => count + 1)
    })

  effect(() => {
    const query = text.get()
    reloads.get()
    let current = true
    const load = () =>
      untrack(() =>
        loadItems(page, query).then(items => {
          if (current) present(items)
        }, nav.fail),
      )
    if (page.delay) onTimeout(load, page.delay)
    else load()
    return () => {
      current = false
    }
  })

  const more = (item: PaletteItem) => advance(actionsPage(item))

  const runAction = (action: PaletteItemAction) => {
    if (!action.returnAfter) return closeAndRun(() => action.run())
    return Promise.resolve()
      .then(() => action.run())
      .then(() => {
        if (nav.isTop(page)) reload()
      }, nav.fail)
  }

  const openActions = () => {
    const item = untrack(() => results.get()[box.selected.get()])
    if (!item?.actions?.length) return false
    more(item)
    return true
  }

  const attempt = async (work: () => Promise<void>) => {
    if (busy.get()) return
    busy.set(true)
    failure.set('')
    const release = nav.hold(page)
    try {
      await work()
    } catch (error) {
      if (nav.isTop(page)) failure.set(errorMessage(error))
      else nav.fail(error)
      progress.set('')
      busy.set(false)
    } finally {
      release()
    }
  }

  const submit = () =>
    attempt(async () => {
      if (!field || !field.action(text.get()).enabled) return busy.set(false)
      const next = await field.submit(text.get())
      if (next) advance(next)
      else nav.close(page)
    })

  const confirm = () =>
    attempt(async () => {
      await page.review?.run(line => progress.set(line))
      nav.close(page)
    })

  const enter = () => {
    if (box.pick()) return
    if (field) void submit()
    else if (page.review) void confirm()
  }

  const empty = derive(() => (!loads.get() || results.get().length ? '' : emptyText(page, text.get())))

  const action = derive(() => {
    loads.get()
    return field?.action(text.get())
  })

  const card = derive(() => {
    loads.get()
    return page.card?.(text.get())
  })

  return {
    page,
    nav,
    text,
    fills,
    busy,
    failure,
    progress,
    box,
    empty,
    rows: derive(() => entries(results.get())),
    action,
    card,
    nested: nav.trail().length > 1,
    more,
    runAction,
    openActions,
    submit,
    confirm,
    enter,
  }
}
