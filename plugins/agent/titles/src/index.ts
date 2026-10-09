import { definePlugin } from 'drydock'
import { titleOf } from './title'

export default definePlugin({
  name: 'titles',
  apply(ctx) {
    ctx.on('turn.start', (session, prompt) => {
      if (session.title) return
      const title = titleOf(prompt)
      if (title) session.rename(title, false)
    })
  },
})
