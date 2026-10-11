import { definePlugin } from 'drydock'
import { imagePath } from './path'
import { imageRoute } from './route'

export default definePlugin({
  name: 'reply-images',
  description: 'Serves the image files a reply links to, so the web UI can show them',
  inject: ['sessions'],
  uses: { server: 'no client can fetch the images' },
  apply(ctx) {
    const route = imageRoute(session => ctx.sessions.open(session)?.cwd)
    ctx.watch('server', server => server?.route(imagePath, route))
  },
})
