import type { PaletteItem, PaletteItemAction, PalettePage } from '../contract'
import { batch, derive, effect, errorMessage, listbox, onTimeout, sig, untrack } from '@sand/dom'
import { entries, loadItems } from './load'
import type { PageMemory, PageNav } from './nav'

export type PageModel = ReturnType<typeof pageModel>

const draftOf = (page: PalettePage, memory: PageMemory, initial: string) => {
  memory.text ??= sig(page.field?.value ?? initial)
  return memory.text
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

  const advance = (next: PalettePage) => {
    memory.selected = box.selected.get()
    nav.push(next)
  }

  const choose = (item: PaletteItem | undefined) => {
    if (!item || item.disabled) return
    if (item.page) return advance(item.page())
    if (item.fill !== undefined) return fill(item.fill)
    nav.close(page)
    void Promise.resolve()
      .then(() => item.run?.())
      .catch(nav.fail)
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
    const show = (items: PaletteItem[]) => {
      if (current) present(items)
    }
    const load = () => untrack(() => loadItems(page, query).then(show, nav.fail))
    if (page.delay) onTimeout(load, page.delay)
    else load()
    return () => {
      current = false
    }
  })

  const fill = (value: string) => {
    text.set(value)
    fills.update(count => count + 1)
  }

  const act = (action: PaletteItemAction) =>
    void Promise.resolve()
      .then(() => action.run())
      .then(() => reloads.update(count => count + 1), nav.fail)

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

  const empty = derive(() => {
    if (!loads.get() || results.get().length) return ''
    return typeof page.empty === 'function' ? page.empty(text.get()) : (page.empty ?? (field || page.review ? '' : 'No matches.'))
  })

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
    act,
    submit,
    confirm,
    enter,
  }
}
