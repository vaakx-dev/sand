import type { BotColor } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import { avatar } from '../avatar'
import type { Template } from './templates'

export const templateCard = (kit: Kit, template: Template, color: () => BotColor, choose: (template: Template) => void) =>
  kit.plainButton(
    { class: 'flex items-start gap-3 rounded-xl bg-neutral-800 p-4 text-left transition-colors hover:bg-neutral-700', onClick: () => choose(template) },
    avatar(() => ({ id: template.id, color: color() }), 40),
    div({ class: 'flex min-w-0 flex-col gap-1' }, kit.headTitle(2, template.label), span({ class: 'text-sm text-neutral-400' }, template.summary)),
  )
