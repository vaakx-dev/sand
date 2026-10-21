import { sessions } from '@sand/chats/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { imagePath } from './path'
import { imageRoute } from './route'

export default definePlugin({
  name: 'images',
  description: 'Serves the image files a reply links to, so the web UI can show them',
  inject: { sessions },
  apply(ctx) {
    const route = imageRoute(session => ctx.sessions.open(session))
    ctx.watch(server, found => found?.route(imagePath, route))
  },
})
