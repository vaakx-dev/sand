import type { Settings } from '@sand/settings/contract'
import { effect, untrack } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { Login } from '../../contract'
import { listPage } from './list'
import { loginPage } from './login'
import type { PageParts } from './model'

const listId = 'logins'

const pageId = (login: string) => `login:${login}`

const childPages = (host: Settings, parts: PageParts) => {
  const shown = new Map<string, { name: string; dispose: Dispose }>()
  const add = (login: Login) => {
    const before = shown.get(login.id)
    if (before?.name === login.name) return
    const dispose = host.page({ id: pageId(login.id), label: login.name, parent: listId, group: 'accounts', render: () => loginPage(parts, login) })
    shown.set(login.id, { name: login.name, dispose })
    void before?.dispose()
  }
  const drop = (id: string) => {
    if (host.current() === pageId(id)) host.open(listId)
    void shown.get(id)?.dispose()
    shown.delete(id)
  }
  const sync = (logins: Login[]) => {
    logins.forEach(add)
    const kept = new Set(logins.map(login => login.id))
    for (const id of [...shown.keys()]) if (!kept.has(id)) drop(id)
  }
  const stop = effect(() => {
    const logins = parts.model.state.get()?.logins ?? []
    untrack(() => sync(logins))
  })
  return () => {
    stop()
    for (const { dispose } of shown.values()) void dispose()
    shown.clear()
  }
}

export const loginsPages = (host: Settings, parts: PageParts) => {
  const open = (login: string) => host.open(pageId(login))
  const list = host.page({
    id: listId,
    label: 'Logins',
    icon: 'key',
    group: 'accounts',
    order: 29,
    render: () => listPage(parts.kit, { model: parts.model, open, added: login => open(login.id) }),
  })
  const children = childPages(host, parts)
  return () => {
    children()
    void list()
  }
}
