import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { advanced } from './contract'
import { readStored, writeStored } from './integrations/stored'

export default definePlugin({
  name: 'advanced',
  description: 'The Advanced controls switch in Settings, which other plugins read to show advanced controls',
  inject: { kit },
  apply(ctx) {
    const on = sig(readStored())
    const set = (value: boolean) => {
      on.set(value)
      writeStored(value)
    }
    const row = () => {
      const { settingsRow, settingsSection, toggleSwitch } = ctx.kit
      return settingsSection(
        {},
        settingsRow(
          { title: 'Advanced controls', detail: 'Show model choice in bot chats' },
          toggleSwitch({ on, 'aria-label': 'Advanced controls', onClick: () => set(!on.get()) }),
        ),
      )
    }
    ctx.provide(advanced, { on: () => on.get(), set })
    ctx.watch(settings, found => found?.section({ page: 'features-core', id: 'advanced', order: 10, render: row }))
  },
})
