import { definePlugin } from 'drydock'
import { approveTool } from './approve'
import { createAsks } from './asks'
import { answersInput } from './schema'
import { askTool } from './tool'
import { createWaiting } from './waiting'

export default definePlugin({
  name: 'ask',
  description: 'ask tool and asks service: questions for the user, including tool approvals',
  inject: ['tools'],
  uses: { server: 'the agent has no ask tool and tool calls that need approval are not run, since no one could answer' },
  apply(ctx) {
    const waiting = createWaiting()
    ctx.effect(() => () => waiting.close())
    ctx.watch('server', server => {
      if (!server) return
      const asks = createAsks(waiting, server)
      const disposers = [
        ctx.tools.register(askTool(waiting)),
        ctx.provide('asks', asks),
        server.handle('ask.answer', ({ session, call, answers }) => waiting.answer(session, call, answersInput.parse(answers))),
        ctx.on('session.opened', (opened, session) => ({ ...opened, asks: asks.pending(session) })),
        ctx.on('server.hello', hello => ({ ...hello, asks: asks.all() })),
        ctx.on('tool.approve', approveTool(asks)),
        asks.close,
      ]
      return () => disposers.forEach(dispose => void dispose())
    })
  },
})
