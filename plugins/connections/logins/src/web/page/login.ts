import { derive, div, sig, type Derive } from '@vaakx-dev/vrui'
import type { Login, Source } from '../../contract'
import { task } from '../task'
import { accessSections } from './access'
import { storageNote } from './list'
import { managers } from './managers/catalog'
import type { PageParts } from './model'
import { confirmButton, editForm, field, rowProblem } from './parts'
import { usesSection } from './uses'
import { valuesSection } from './values'

const detailsSection = ({ kit, model }: PageParts, login: Derive<Login>) => {
  const { id, kind, name: named, site: placed = '' } = login.get()
  const name = sig(named)
  const site = sig(placed)
  const website = kind === 'website'
  const changed = () => name.get().trim() !== login.get().name || (website && site.get().trim() !== login.get().site)
  const ready = () => Boolean(changed() && name.get().trim() && (!website || site.get().trim()))
  const submit = () => model.change(id, { name: name.get().trim(), ...(website && { site: site.get().trim() }) })
  return kit.settingsSection(
    { title: 'Details' },
    kit.rowDetail(
      editForm(
        kit,
        { save: 'Save', ready, submit },
        field(kit, 'Name', { type: 'text', bindValue: name }),
        website ? field(kit, 'Site', { type: 'text', inputMode: 'url', bindValue: site }) : null,
      ),
    ),
  )
}

const deletes = (source: Source) =>
  source === 'sand'
    ? { title: 'Delete login', detail: 'Bots and threads lose it right away.', label: 'Delete', confirm: 'Delete for good' }
    : {
        title: 'Remove from sand',
        detail: `Removes only sand's pointer; the item stays in ${managers[source].name}. Bots and threads lose it right away.`,
        label: 'Remove',
        confirm: 'Remove from sand',
      }

const deleteSection = ({ kit, model }: PageParts, login: Derive<Login>) => {
  const work = task()
  const { title, detail, label, confirm } = deletes(login.get().source)
  return kit.settingsSection(
    {},
    kit.settingsRow(
      { title, detail },
      confirmButton(kit, label, confirm, () => work.run(() => model.remove(login.get().id))),
    ),
    rowProblem(kit, work),
  )
}

export const loginPage = (parts: PageParts, shown: Login) => {
  const login = derive(() => parts.model.find(shown.id) ?? shown)
  return div(
    { class: 'flex flex-col gap-6' },
    detailsSection(parts, login),
    valuesSection(parts.kit, parts.model, login),
    accessSections(parts, login),
    usesSection(parts.kit, parts.wire, shown.id),
    deleteSection(parts, login),
    shown.source === 'sand' ? storageNote(parts.kit, parts.model.state) : null,
  )
}
