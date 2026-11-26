import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { computers } from '@sand/computers/contract'
import { media } from '@sand/media/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { Chooser } from './chosen'
import { computerTools, group } from './tools'

export default definePlugin({
  name: 'computer-tools',
  description:
    "computer_list, computer_screenshot, computer_elements, computer_read and computer_act: the agent sees and uses computers, by default the last one named in the chat, a bot's chosen one or the only browser; off until the user turns them on",
  inject: { computers, tools, media, sessions },
  apply(ctx) {
    ctx.effect(() =>
      ctx.tools.group({ name: group, label: 'Computer use', summary: 'see and use browsers and desktops: screenshots, UI elements, clicks and typing', load: 'off' }),
    )
    const chooser = new Chooser({ computers: ctx.computers, bots: () => ctx.get(bots), sessions: ctx.sessions })
    for (const tool of computerTools(ctx.computers, ctx.media, chooser)) ctx.effect(() => ctx.tools.register(tool))
  },
})
