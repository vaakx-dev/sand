import { definePlugin } from 'drydock'
import { runReact } from './run'

export default definePlugin({
  name: 'loop-react',
  description: 'The agent loop: sends the conversation to the model, runs the tools it calls and repeats until it is done',
  inject: ['loops'],
  apply(ctx) {
    ctx.effect(() =>
      ctx.loops.register({
        name: 'react',
        label: 'Act as you go',
        description: 'The model replies, the tools it calls run, and it repeats until it is done',
        plugin: 'loop-react',
        run: runReact,
      }),
    )
  },
})
