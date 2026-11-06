import type { BotPatch, BotSummary, Computer } from '@sand/bots/contract'
import type { Choice, Kit } from '@sand/ui-kit/contract'

const choices: Choice<Computer>[] = [
  { value: 'none', label: 'None' },
  { value: 'own', label: 'Browser', title: 'The browser sand controls' },
  { value: 'this-pc', label: 'This PC', title: "This PC's screen, mouse and keyboard" },
]

export const computerSection = ({ segmented, settingsRow, settingsSection }: Kit, bot: () => BotSummary, save: (patch: BotPatch) => void) =>
  settingsSection(
    {},
    settingsRow(
      { title: 'Computer', detail: 'What its computer tools use when it names none' },
      segmented(choices, () => bot().computer, computer => save({ computer }), { label: 'Computer' }),
    ),
  )
