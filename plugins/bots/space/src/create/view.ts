import { freshColor, newBot, type BotColor, type BotSummary, type NewBot } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, show, sig, type Derive } from '@vaakx-dev/vrui'
import { avatar } from '../avatar'
import { pane, paneHead, scrollBody, type HeadParts } from '../pane'
import { draftOf, identityFields } from '../profile/identity'
import { templateCard } from './card'
import { templates, type Template } from './templates'

export interface CreateParts extends HeadParts {
  bots: Derive<BotSummary[] | undefined>
  create(spec: NewBot): Promise<BotSummary>
  created(bot: BotSummary): void
}

const picker = (kit: Kit, parts: CreateParts, color: () => BotColor, choose: (template: Template) => void) =>
  pane(
    {},
    paneHead(kit, parts, kit.headTitle(1, 'New bot')),
    scrollBody(kit, div({ class: 'grid gap-3 sm:grid-cols-2' }, ...templates.map(template => templateCard(kit, template, color, choose)))),
  )

const form = (kit: Kit, parts: CreateParts, template: Template, fresh: () => BotColor, back: () => void) => {
  const { errorText, headTitle, icon, iconButton, primaryAction } = kit
  const id = crypto.randomUUID()
  const draft = draftOf(template.start)
  const picked = sig<BotColor | undefined>(undefined)
  const color = () => picked.get() ?? fresh()
  const spec = derive((): NewBot => {
    const chosen = picked.get()
    return { id, name: draft.name.get().trim(), job: draft.job.get(), ...(chosen && { color: chosen }) }
  })
  const creating = sig(false)
  const failure = sig<string | undefined>(undefined)
  const valid = derive(() => newBot.safeParse(spec.get()).success)
  const submit = () => {
    if (!valid.get() || creating.get()) return
    creating.set(true)
    parts.create(spec.get()).then(parts.created, error => {
      creating.set(false)
      failure.set(errorMessage(error))
    })
  }
  return pane(
    {},
    paneHead(
      kit,
      parts,
      iconButton({ title: 'Back to templates', 'aria-label': 'Back to templates', onClick: back }, icon('back')),
      avatar(() => ({ id, color: color() }), 32),
      headTitle(1, () => draft.name.get().trim() || 'New bot'),
    ),
    scrollBody(
      kit,
      ...identityFields(kit, { id, draft, color, pick: choice => picked.set(choice), save: () => undefined }),
      div(
        { class: 'flex flex-wrap items-center justify-end gap-3' },
        show(
          () => Boolean(failure.get()),
          () => errorText(() => failure.get() ?? ''),
        ),
        primaryAction({ disabled: () => !valid.get() || creating.get(), onClick: submit }, 'Create'),
      ),
    ),
  )
}

export const createView = (kit: Kit, parts: CreateParts) => {
  const chosen = sig<Template | undefined>(undefined)
  const fresh = () => freshColor(parts.bots.get() ?? [])
  return dynamicChild(chosen, template =>
    template ? form(kit, parts, template, fresh, () => chosen.set(undefined)) : picker(kit, parts, fresh, choice => chosen.set(choice)),
  )
}
