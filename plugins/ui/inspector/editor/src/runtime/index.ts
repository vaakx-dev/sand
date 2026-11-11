import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { editorOpen, editorsList } from '../contract'
import { detect } from './editors'
import { openFolder } from './open'
import { launch, system } from './system'

export default definePlugin({
  name: 'inspector-editor',
  description: "Lists the editors, file manager and terminal on a thread's PC and opens the thread's folder in one",
  apply(ctx) {
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.handle(editorsList, () => detect(system)),
            found.handle(editorOpen, input => openFolder(input, system, launch)),
          )
        : undefined,
    )
  },
})
