import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, effect, onTimeout, show, sig, type Sig } from '@vaakx-dev/vrui'
import type { External, Login, Pointer, SourceItem } from '../../../contract'
import type { LoginsModel, PickedLogin } from '../model'
import { editForm, field, kindIcons } from '../parts'
import { managers } from './catalog'

const typingMs = 250

const shownItems = 50

const kindNames = { website: 'Login', key: 'Key' } as const

const pointerOf = (item: SourceItem): Pointer =>
  item.source === '1password'
    ? { source: item.source, item: item.item, vault: item.vault, ...(item.account && { account: item.account }) }
    : { source: item.source, item: item.item }

const metaOf = ({ kind, sites, place, totp }: SourceItem) => [kindNames[kind], sites.join(', '), place, totp ? 'authenticator' : ''].filter(Boolean).join(' · ')

const searchOf = (model: LoginsModel, source: External) => {
  const query = sig('')
  const items = sig<SourceItem[] | undefined>(undefined)
  const failure = sig('')
  let asked = 0
  const run = (text: string) => {
    const mine = ++asked
    model.search(source, text).then(
      found => {
        if (mine !== asked) return
        failure.set('')
        items.set(found)
      },
      (error: unknown) => {
        if (mine === asked) failure.set(errorMessage(error))
      },
    )
  }
  effect(() => {
    const text = query.get()
    return onTimeout(() => run(text), text.trim() ? typingMs : 0)
  })
  return { query, items, failure, retry: () => run(query.get()) }
}

type Search = ReturnType<typeof searchOf>

const pickForm = (kit: Kit, item: SourceItem, save: (login: PickedLogin) => Promise<unknown>, back: () => void) => {
  const name = sig('')
  const site = sig('')
  const website = item.kind === 'website'
  const submit = () => {
    const named = name.get().trim()
    const where = site.get().trim()
    return save({ ...pointerOf(item), ...(named && { name: named }), ...(website && where && { site: where }) })
  }
  return editForm(
    kit,
    { save: 'Add login', ready: () => !website || Boolean(item.sites.length || site.get().trim()), submit, cancel: back },
    div({ class: 'flex flex-col' }, kit.rowTitle(item.name), kit.metaLine(metaOf(item))),
    field(kit, 'Name', { type: 'text', placeholder: item.name, bindValue: name, onMount: node => node.focus() }),
    website ? field(kit, 'Site', { type: 'text', inputMode: 'url', placeholder: item.sites[0] ?? 'github.com', bindValue: site }) : null,
  )
}

const itemRow = ({ icon, listRow }: Kit, item: Sig<SourceItem>, choose: (item: SourceItem) => void) =>
  listRow({
    lead: icon(kindIcons[item.get().kind], 'sm'),
    title: () => item.get().name,
    meta: () => metaOf(item.get()),
    onClick: () => choose(item.get()),
  })

const resultRows = (kit: Kit, { items, failure, retry }: Search, texts: { looking: string; empty: () => string }, choose: (item: SourceItem) => void) => {
  const { emptyState, errorState, loadingState, rowList } = kit
  const shown = derive(() => (items.get() ?? []).slice(0, shownItems))
  const phase = derive(() => {
    if (failure.get()) return 'failed'
    if (items.get() === undefined) return 'loading'
    return shown.get().length ? 'rows' : 'empty'
  })
  return dynamicChild(phase, current => {
    if (current === 'failed') return errorState({ flush: true, text: () => failure.get(), retry })
    if (current === 'loading') return loadingState({ flush: true, text: texts.looking })
    if (current === 'empty') return emptyState({ text: texts.empty })
    return div(
      { class: 'contents' },
      rowList(
        shown,
        item => item.item,
        item => itemRow(kit, item, choose),
      ),
      show(
        () => (items.get()?.length ?? 0) > shownItems,
        () => emptyState({ text: `Showing the first ${shownItems}. Type to narrow it down.` }),
      ),
    )
  })
}

export const pickRows = (kit: Kit, model: LoginsModel, source: External, finish: (login: Login) => void, close: () => void) => {
  const { name } = managers[source]
  const search = searchOf(model, source)
  const chosen = sig<SourceItem | undefined>(undefined)
  const save = async (login: PickedLogin) => finish(await model.pick(login))
  const texts = {
    looking: `Searching ${name}…`,
    empty: () => (search.query.get().trim() ? 'Nothing matches.' : `Nothing in ${name} sand can use.`),
  }
  return dynamicChild(chosen, item =>
    item
      ? kit.rowDetail(pickForm(kit, item, save, () => chosen.set(undefined)))
      : div(
          { class: 'contents' },
          kit.rowDetail(
            div(
              { class: 'flex items-center gap-2' },
              kit.searchField({ placeholder: `Search ${name}`, 'aria-label': `Search ${name}`, bindValue: search.query, onMount: node => node.focus() }),
              kit.secondaryAction({ size: 'sm', onClick: close }, 'Cancel'),
            ),
          ),
          resultRows(kit, search, texts, found => chosen.set(found)),
        ),
  )
}
