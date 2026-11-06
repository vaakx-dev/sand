import { bots } from '@sand/bots/contract'
import { computers } from '@sand/computers/contract'
import { media } from '@sand/media/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { chosenComputer } from './chosen'
import { computerTools, group } from './tools'

export default definePlugin({
  name: 'computer-tools',
  description:
    "computer_list, computer_screenshot, computer_elements and computer_act: the agent sees and uses computers, a bot its chosen one by default; off until the user turns them on",
  inject: { computers, tools, media },
  apply(ctx) {
    ctx.effect(() =>
      ctx.tools.group({ name: group, label: 'Computer use', summary: 'see and use browsers and desktops: screenshots, UI elements, clicks and typing', load: 'off' }),
    )
    for (const tool of computerTools(ctx.computers, ctx.media, chosenComputer(() => ctx.get(bots)))) ctx.effect(() => ctx.tools.register(tool))
  },
})
