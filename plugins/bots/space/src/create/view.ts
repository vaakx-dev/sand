import { freshColor, type BotSummary, type NewBot } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, show, type Derive } from '@vaakx-dev/vrui'
import { pane, paneHead, scrollBody, type HeadParts } from '../pane'
import { templateCard } from './card'
import { starter } from './start'
import { templates } from './templates'

export interface CreateParts extends HeadParts {
  bots: Derive<BotSummary[] | undefined>
  create(spec: NewBot): Promise<BotSummary>
  created(bot: BotSummary): void
}

export const createView = (kit: Kit, parts: CreateParts) => {
  const { choose, failure } = starter(parts.create, parts.created)
  const color = () => freshColor(parts.bots.get() ?? [])
  return pane(
    {},
    paneHead(kit, parts, kit.headTitle(1, 'New bot')),
    scrollBody(
      kit,
      div({ class: 'grid gap-3 sm:grid-cols-2' }, ...templates.map(template => templateCard(kit, template, color, choose))),
      show(
        () => Boolean(failure.get()),
        () => kit.errorText(() => failure.get()),
      ),
    ),
  )
}
