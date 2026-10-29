import { sessionRemove } from '@sand/chats/contract'
import { turnPrompt } from '@sand/loop/contract'
import { paths } from '@sand/paths/contract'
import { definePlugin } from 'drydock'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { saveImages } from './save'

export default definePlugin({
  name: 'image-files',
  description: 'Saves the images sent in a chat to files and adds their paths to the message, so the agent can pass them on',
  inject: { paths },
  apply(ctx) {
    const folder = (session: string) => join(ctx.paths.home, 'images', session)
    ctx.on(turnPrompt, (content, session) => saveImages(folder(session.id), content))
    ctx.on(sessionRemove, id => void rm(folder(id), { recursive: true, force: true }).catch(error => ctx.report(error)))
  },
})
