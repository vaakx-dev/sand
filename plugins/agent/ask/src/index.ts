import { definePlugin } from 'drydock'
import { answersInput } from './schema'
import { askTool } from './tool'
import { createWaiting } from './waiting'

export default definePlugin({
  name: 'ask',
  description: 'ask tool: the agent asks the user questions and waits for the answers',
  inject: ['tools'],
  uses: { server: 'the agent has no ask tool, since no one could answer' },
  apply(ctx) {
    const waiting = createWaiting()
    ctx.effect(() => () => waiting.close())
    ctx.watch('server', server => {
      if (!server) return
      const disposers = [
        ctx.tools.register(askTool(waiting)),
        server.handle('ask.answer', ({ session, call, answers }) => waiting.answer(session, call, answersInput.parse(answers))),
      ]
      return () => disposers.forEach(dispose => void dispose())
    })
  },
})
