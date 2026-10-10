import type { SourceInfo } from '@sand/llm-accounts/contract'
import { div, dynamicChild, hint, providerIcon, settingsSection, untrack } from '@sand/dom'
import type { Kit } from '../kit'
import { crumb, whereText } from '../parts'
import { createCatalog } from './catalog'
import { createFilter } from './filter'
import { modelsSection } from './models'
import { optionsSection } from './options'

const body = (kit: Kit, first: SourceInfo, latest: () => SourceInfo) => {
  const catalog = createCatalog(kit, first.id)
  const filter = createFilter(first, catalog)
  return div({ class: 'flex flex-col gap-6' }, modelsSection(first, catalog, filter), optionsSection(kit, latest))
}

const gone = () => settingsSection({}, div({ class: 'bg-neutral-900' }, hint('This account is no longer signed in.')))

const title = (source: SourceInfo | undefined, id: string) => {
  if (!source) return id
  const where = whereText(source)
  return where ? `${source.label} ${where}` : source.label
}

export const sourcePage = (kit: Kit, id: string) => {
  const info = kit.changes.read(() => kit.source(id))
  return div(
    { class: 'flex flex-col gap-6' },
    crumb(kit, providerIcon(untrack(() => info.get()?.provider), 14), () => title(info.get(), id)),
    dynamicChild(
      info.map(found => !!found),
      () => {
        const first = info.get()
        return first ? body(kit, first, () => info.get() ?? first) : gone()
      },
    ),
  )
}
