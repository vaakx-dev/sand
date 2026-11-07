import { botName, botPatch, type BotPatch, type BotProfileSection } from '@sand/bots/contract'
import { div, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import { confirmButton } from '../confirm'
import type { BotsContext } from '../context'
import { avatar } from '../avatar'
import { pane, paneHead, scrollBody, type HeadParts } from '../pane'
import { computerSection } from './computer'
import { holdSection } from './hold'
import { draftOf, identityFields } from './identity'
import { jobsSection } from './jobs'
import { memorySection } from './memory'
import { modelSection, type ModelParts } from './models'

export interface ProfileParts extends HeadParts, ModelParts {
  sections: Sig<BotProfileSection[]>
  chat(): void
  discard(): Promise<unknown>
}

const checked = (save: (patch: BotPatch) => void) => (patch: BotPatch) => {
  if (botPatch.safeParse(patch).success) save(patch)
}

export const profileView = (ctx: BotsContext, parts: ProfileParts) => {
  const { kit } = ctx
  const { headTitle, icon, iconButton, settingsRow, settingsSection } = kit
  const { bot } = parts
  const id = bot().id
  const save = checked(parts.save)
  const draft = draftOf(bot())
  const discard = () => parts.discard().catch(error => ctx.report(error))
  return pane(
    {},
    paneHead(
      kit,
      parts,
      iconButton({ title: 'Back to the chat', 'aria-label': 'Back to the chat', onClick: parts.chat }, icon('back')),
      avatar(bot, 32),
      headTitle(1, () => botName(bot())),
    ),
    scrollBody(
      kit,
      ...identityFields(kit, { id, draft, color: () => bot().color, pick: color => save({ color }), save }),
      jobsSection(ctx, bot, job => {
        draft.job.set(job)
        save({ job })
      }),
      modelSection(kit, { ...parts, save }),
      computerSection(kit, bot, save),
      holdSection(kit, bot, save),
      memorySection(ctx, id),
      dynamicChild(parts.sections, found => div({ class: 'contents' }, ...found.map(section => section.render(id)))),
      settingsSection({}, settingsRow({ title: 'Delete bot' }, confirmButton(kit, { label: 'Delete', confirm: 'Delete for good', run: discard }))),
    ),
  )
}
