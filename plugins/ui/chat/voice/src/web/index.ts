import { composer } from '@sand/composer/contract'
import { wire } from '@sand/devices-contract'
import { settings } from '@sand/settings/contract'
import { toastsOf } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { micButton } from './mic'
import { voiceModel } from './model'
import { voicePage } from './settings/page'

const PAGE = 'voice'

const MIC_ORDER = 10

export default definePlugin({
  name: 'voice-web',
  description: 'A microphone in the composer that turns what you say into text in your draft, and Settings › Voice to choose where speech becomes text',
  inject: { wire, kit },
  apply(ctx) {
    const model = voiceModel(ctx, ctx.wire)
    const openSettings = () => ctx.get(settings)?.open(PAGE)
    ctx.watch(settings, found =>
      found?.page({
        id: PAGE,
        label: 'Voice',
        intro: 'Speak instead of typing. What you say lands in your message, ready to edit and send.',
        icon: 'mic',
        group: 'app',
        order: 15,
        render: () => voicePage(ctx.kit, model, () => ctx.get(settings)?.open('accounts')),
      }),
    )
    ctx.watch(composer, found => found?.shared('end', here => micButton({ kit: ctx.kit, model, here, toasts: toastsOf(ctx), openSettings }), MIC_ORDER))
  },
})
