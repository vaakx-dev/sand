import { planChangeWire, planLimit, planRead, planWrite } from '@sand/bot-plan/contract'
import { wire } from '@sand/devices-contract'
import { markdown } from '@sand/markdown/contract'
import { panel } from '@sand/panel/contract'
import { wireValues } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { div } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'panel-plan',
  description: "The side panel's plan tab: a bot's plan, live, with its thread links showing each thread's state, and editable",
  inject: { panel, kit, markdown, wire },
  apply(ctx) {
    const plans = wireValues(ctx, ctx.wire, {
      key: (bot: string) => bot,
      read: bot => ctx.wire.call(planRead, { bot }),
      change: planChangeWire,
      changed: payload => payload,
    })
    const planOf = (bot: string) => plans(bot) ?? ''

    const render = (subject: () => Subject) => {
      const bot = subject().session
      const text = () => planOf(bot)
      return div(
        { class: 'p-4' },
        ctx.kit.editable({
          text,
          view: plan => div({ class: 'flex flex-col gap-2' }, ...ctx.markdown.nodes(plan)),
          empty: 'No plan yet.',
          save: plan => ctx.wire.call(planWrite, { bot, text: plan }),
          rows: 16,
          maxLength: planLimit,
          placeholder: 'What the bot is working on and what comes next',
        }),
      )
    }

    ctx.effect(() =>
      ctx.panel.tab({
        id: 'plan',
        label: 'Plan',
        icon: 'list-checks',
        order: 5,
        shows: subject => subject.owner === 'bot',
        render,
      }),
    )
  },
})
